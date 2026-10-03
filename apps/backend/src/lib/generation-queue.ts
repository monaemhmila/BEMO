import Redis from "ioredis";
import { randomUUID } from "node:crypto";
import { env } from "../config/env";
import { logger } from "./logger";

export type PageGenerationJob = {
  jobId: string;
  pageId: string;
  prompt: string;
  referenceImageUrl?: string | null;
  options?: { childName?: string; position?: "left" | "right"; artStyle?: string; gender?: "boy" | "girl" };
};

const QUEUE_KEY = "mon-petit-hero:generation:pages";

export class GenerationQueue {
  private static instance: GenerationQueue;
  private readonly redis: Redis | null;
  private running = false;

  private constructor() {
    this.redis = env.REDIS_URL
      ? new Redis(env.REDIS_URL, { maxRetriesPerRequest: null, enableReadyCheck: true })
      : null;
    this.redis?.on("error", (error) => logger.error({ error }, "Generation queue Redis error"));
  }

  static getInstance() {
    return (this.instance ??= new GenerationQueue());
  }

  async enqueue(input: Omit<PageGenerationJob, "jobId">, fallback: () => Promise<void>): Promise<string> {
    const job = { ...input, jobId: randomUUID() };
    if (this.redis) {
      await this.redis.lpush(QUEUE_KEY, JSON.stringify(job));
      return job.jobId;
    }
    setImmediate(() => fallback().catch((error) => logger.error({ error, jobId: job.jobId }, "Fallback generation job failed")));
    return job.jobId;
  }

  start(handler: (job: PageGenerationJob) => Promise<void>) {
    if (!this.redis || this.running) return;
    this.running = true;
    void this.consume(handler);
    logger.info({ queue: QUEUE_KEY }, "Redis generation worker started");
  }

  private async consume(handler: (job: PageGenerationJob) => Promise<void>) {
    while (this.running && this.redis) {
      try {
        const result = await this.redis.brpop(QUEUE_KEY, 0);
        if (!result) continue;
        const job = JSON.parse(result[1]) as PageGenerationJob;
        await handler(job);
      } catch (error) {
        logger.error({ error }, "Generation queue job failed");
      }
    }
  }
}
