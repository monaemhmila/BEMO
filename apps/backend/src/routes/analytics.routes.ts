import { Router } from "express";
import { prismaClient } from "../lib/prisma";
import { logger } from "../lib/logger";
import { z } from "zod";

const router = Router();

// ─────────────────────────────────────────
// TRACK
// ─────────────────────────────────────────

const TrackEventSchema = z.object({
  eventType: z.enum(["visit", "click"]),
  path: z.string().trim().min(1).max(300),
  label: z.string().trim().max(200).optional(),
  referrer: z.string().trim().max(1000).nullable().optional(),
  sessionId: z.string().trim().max(200).nullable().optional(),
  userId: z.string().trim().max(100).nullable().optional(),
});

/**
 * POST /analytics/track
 * Public, fire-and-forget analytics endpoint used by the website (sendBeacon).
 * Accepts a single visit or click event and stores it for statistics.
 */
router.post("/track", async (req, res) => {
  const parsed = TrackEventSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Invalid input", errors: parsed.error.flatten() });
    return;
  }

  const { eventType, path, label, referrer, sessionId, userId } = parsed.data;

  try {
    await prismaClient.pageEvent.create({
      data: {
        eventType,
        path,
        label,
        referrer,
        sessionId,
        userId,
      },
    });
    res.json({ success: true });
  } catch (error) {
    logger.error({ error }, "Failed to record analytics event");
    res.status(500).json({ message: "Failed to record event" });
  }
});

// ─────────────────────────────────────────
// STATS
// ─────────────────────────────────────────

/**
 * GET /analytics/stats?days=30
 * Public aggregate statistics (no PII). Returns totals, per-page breakdown,
 * top clicked elements and a daily visit/click trend.
 */
router.get("/stats", async (req, res) => {
  try {
    const parsedDays = parseInt(String(req.query.days ?? "30"), 10);
    const days = Number.isFinite(parsedDays) ? Math.min(Math.max(parsedDays, 1), 365) : 30;

    const startDate = new Date();
    startDate.setUTCHours(0, 0, 0, 0);
    startDate.setUTCDate(startDate.getUTCDate() - (days - 1));

    const [visitsByPath, clicksByPath, visitorsByPath, totalVisits, totalClicks, topClicks, dailyRows] =
      await Promise.all([
        prismaClient.pageEvent.groupBy({
          by: ["path"],
          where: { eventType: "visit", createdAt: { gte: startDate } },
          _count: { _all: true },
          orderBy: { _count: { path: "desc" } },
        }),
        prismaClient.pageEvent.groupBy({
          by: ["path"],
          where: { eventType: "click", createdAt: { gte: startDate } },
          _count: { _all: true },
          orderBy: { _count: { path: "desc" } },
        }),
        prismaClient.$queryRaw<
          Array<{ path: string; visitors: number }>
        >`
          SELECT "path", COUNT(DISTINCT "sessionId")::int AS visitors
          FROM "PageEvent"
          WHERE "eventType" = 'visit' AND "createdAt" >= ${startDate}
          GROUP BY "path"
        `,
        prismaClient.pageEvent.count({ where: { eventType: "visit", createdAt: { gte: startDate } } }),
        prismaClient.pageEvent.count({ where: { eventType: "click", createdAt: { gte: startDate } } }),
        prismaClient.pageEvent.groupBy({
          by: ["label", "path"],
          where: { eventType: "click", label: { not: null }, createdAt: { gte: startDate } },
          _count: { _all: true },
          orderBy: { _count: { label: "desc" } },
          take: 25,
        }),
        prismaClient.$queryRaw<
          Array<{ day: Date; eventType: string; count: number }>
        >`
          SELECT date_trunc('day', "createdAt")::date AS day, "eventType", COUNT(*)::int AS count
          FROM "PageEvent"
          WHERE "createdAt" >= ${startDate}
          GROUP BY 1, 2
          ORDER BY day ASC
        `,
      ]);

    // Merge per-path counts into a single sorted row
    const perPageMap = new Map<string, { path: string; visits: number; clicks: number; visitors: number }>();
    const ensure = (path: string) => {
      let row = perPageMap.get(path);
      if (!row) {
        row = { path, visits: 0, clicks: 0, visitors: 0 };
        perPageMap.set(path, row);
      }
      return row;
    };
    for (const v of visitsByPath) ensure(v.path).visits = v._count._all;
    for (const c of clicksByPath) ensure(c.path).clicks = c._count._all;
    for (const v of visitorsByPath) ensure(v.path).visitors = v.visitors;

    // Unique visitors total (distinct session ids for visits in the window)
    const totalVisitorsRows = await prismaClient.$queryRaw<
      Array<{ count: number }>
    >`
      SELECT COUNT(DISTINCT "sessionId")::int AS count
      FROM "PageEvent"
      WHERE "eventType" = 'visit' AND "createdAt" >= ${startDate}
    `;
    const totalVisitors = totalVisitorsRows[0]?.count ?? 0;

    const perPage = [...perPageMap.values()]
      .sort((a, b) => b.visits - a.visits || b.clicks - a.clicks)
      .slice(0, 40);

    // Daily trend, including zero-fill for empty days
    const dayMap = new Map<string, { date: string; visits: number; clicks: number }>();
    for (const row of dailyRows) {
      const day = row.day instanceof Date ? row.day : new Date(row.day);
      const key = day.toISOString().slice(0, 10);
      let entry = dayMap.get(key);
      if (!entry) {
        entry = { date: key, visits: 0, clicks: 0 };
        dayMap.set(key, entry);
      }
      if (row.eventType === "visit") entry.visits = row.count;
      else if (row.eventType === "click") entry.clicks = row.count;
    }
    const daily: { date: string; visits: number; clicks: number }[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date(startDate);
      d.setUTCDate(startDate.getUTCDate() + i);
      const key = d.toISOString().slice(0, 10);
      daily.push(dayMap.get(key) ?? { date: key, visits: 0, clicks: 0 });
    }

    res.json({
      totals: {
        visits: totalVisits,
        clicks: totalClicks,
        visitors: totalVisitors,
      },
      perPage,
      topClicks: topClicks.map((t) => ({
        label: t.label as string,
        path: t.path,
        count: t._count._all,
      })),
      daily,
    });
  } catch (error) {
    logger.error({ error }, "Failed to fetch analytics stats");
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
});

export const analyticsRouter = router;