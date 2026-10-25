import { randomUUID } from "node:crypto";
import { logger } from "../lib/logger";

const MAX_ACTIVE_PREVIEWS = 10;
const MAX_TOTAL_PREVIEWS = 30;
const BATCH_DELAY_MS = 3 * 60 * 1000;
const JOB_RETENTION_MS = 15 * 60 * 1000;

export type PreviewQueueState = "queued" | "processing" | "completed" | "failed";

type PreviewJob = {
  id: string;
  ownerId: string;
  state: PreviewQueueState;
  position: number;
  queuedAt: number;
  startedAt?: number;
  finishedAt?: number;
  result?: unknown;
  error?: string;
  run: () => Promise<unknown>;
  onFailure?: (error: unknown) => Promise<void>;
};

/**
 * Limits expensive preview work to ten active stories. Jobs after the first
 * batch are deliberately released no sooner than three minutes later so a
 * traffic spike cannot overwhelm the image provider or this process.
 *
 * This is intentionally a process-local gate. Production deployments should
 * run one generation worker or move this state to Redis before scaling the
 * backend horizontally.
 */
export class PreviewGenerationQueue {
  private static instance: PreviewGenerationQueue;
  private readonly pending: PreviewJob[] = [];
  private readonly jobs = new Map<string, PreviewJob>();
  private active = 0;
  private scheduled = 0;
  private nextBatchAt = 0;
  private batchTimer: ReturnType<typeof setTimeout> | null = null;

  static getInstance(): PreviewGenerationQueue {
    return (this.instance ??= new PreviewGenerationQueue());
  }

  enqueue(ownerId: string, run: () => Promise<unknown>, onFailure?: (error: unknown) => Promise<void>) {
    const total = this.active + this.scheduled + this.pending.length;
    if (total >= MAX_TOTAL_PREVIEWS) return null;

    const job: PreviewJob = {
      id: randomUUID(),
      ownerId,
      state: "queued",
      position: this.active + this.scheduled + this.pending.length + 1,
      queuedAt: Date.now(),
      run,
      onFailure,
    };
    this.jobs.set(job.id, job);
    this.pending.push(job);
    this.pump();

    return {
      jobId: job.id,
      position: job.position,
      active: this.active + this.scheduled,
      queued: this.pending.length,
      estimatedWaitSeconds: Math.max(0, Math.floor((job.position - 1) / MAX_ACTIVE_PREVIEWS) * Math.ceil(BATCH_DELAY_MS / 1000)),
    };
  }

  getStatus(jobId: string, ownerId: string) {
    const job = this.jobs.get(jobId);
    if (!job || job.ownerId !== ownerId) return null;

    return {
      jobId: job.id,
      state: job.state,
      position: job.position,
      active: this.active + this.scheduled,
      queued: this.pending.length,
      result: job.result,
      error: job.error,
      startedAt: job.startedAt,
      finishedAt: job.finishedAt,
    };
  }

  private pump() {
    const capacity = MAX_ACTIVE_PREVIEWS - this.active - this.scheduled;
    if (capacity <= 0 || this.pending.length === 0) return;

    const now = Date.now();
    if (this.nextBatchAt > now) {
      this.schedulePump(this.nextBatchAt - now);
      return;
    }

    const batch = this.pending.splice(0, Math.min(MAX_ACTIVE_PREVIEWS, capacity));
    this.scheduled += batch.length;
    for (const job of batch) {
      void this.start(job);
    }

    if (this.pending.length > 0) {
      this.nextBatchAt = Date.now() + BATCH_DELAY_MS;
      this.schedulePump(BATCH_DELAY_MS);
    }
  }

  private schedulePump(delayMs: number) {
    if (this.batchTimer) return;
    this.batchTimer = setTimeout(() => {
      this.batchTimer = null;
      this.pump();
    }, Math.max(0, delayMs));
  }

  private async start(job: PreviewJob) {
    this.scheduled -= 1;
    this.active += 1;
    job.state = "processing";
    job.startedAt = Date.now();

    try {
      job.result = await job.run();
      job.state = "completed";
    } catch (error) {
      job.state = "failed";
      job.error = error instanceof Error ? error.message : "Preview generation failed";
      if (job.onFailure) {
        await job.onFailure(error).catch((failureError) => {
          logger.error({ error: failureError, jobId: job.id }, "Failed to mark preview job as failed");
        });
      }
      logger.error({ error, jobId: job.id }, "Preview generation job failed");
    } finally {
      this.active -= 1;
      job.finishedAt = Date.now();
      this.pump();
      setTimeout(() => this.jobs.delete(job.id), JOB_RETENTION_MS);
    }
  }
}

export const previewGenerationQueue = PreviewGenerationQueue.getInstance();
