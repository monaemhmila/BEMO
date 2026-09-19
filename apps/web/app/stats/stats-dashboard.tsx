"use client";

import { useEffect, useState } from "react";
import { Eye, MousePointerClick, TrendingUp, Users } from "lucide-react";
import { BACKEND_URL } from "../config";

interface PerPageStat {
  path: string;
  visits: number;
  clicks: number;
  visitors: number;
}

interface TopClickStat {
  label: string;
  path: string;
  count: number;
}

interface DailyStat {
  date: string;
  visits: number;
  clicks: number;
}

interface StatsData {
  totals: { visits: number; clicks: number; visitors: number };
  perPage: PerPageStat[];
  topClicks: TopClickStat[];
  daily: DailyStat[];
}

export function StatsDashboard() {
  const [data, setData] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/analytics/stats?days=30`);
        if (!res.ok) throw new Error("Bad status");
        const json: StatsData = await res.json();
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return (
      <section className="shell py-12">
        <div className="flex items-center gap-3 text-stone-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Loading statistics…
        </div>
      </section>
    );
  }

  if (error || !data) {
    return (
      <section className="shell py-12">
        <p className="text-stone-500">Statistics are temporarily unavailable. Please try again shortly.</p>
      </section>
    );
  }

  const maxVisits = Math.max(1, ...(data.perPage.map((p) => p.visits) ?? [1]));
  const maxTrend = Math.max(1, ...(data.daily.map((d) => Math.max(d.visits, d.clicks)) ?? [1]));
  const avgViews = data.totals.visitors > 0 ? (data.totals.visits / data.totals.visitors).toFixed(1) : "—";

  const cards = [
    { label: "Visits", value: data.totals.visits.toLocaleString(), icon: <Eye className="h-5 w-5" />, cls: "bg-blue-500/15 text-blue-600" },
    { label: "Clicks", value: data.totals.clicks.toLocaleString(), icon: <MousePointerClick className="h-5 w-5" />, cls: "bg-emerald-500/15 text-emerald-600" },
    { label: "Unique Visitors", value: data.totals.visitors.toLocaleString(), icon: <Users className="h-5 w-5" />, cls: "bg-purple-500/15 text-purple-600" },
    { label: "Views per Visitor", value: avgViews, icon: <TrendingUp className="h-5 w-5" />, cls: "bg-buttercup/25 text-violet-deep" },
  ];

  return (
    <section className="shell py-12">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
            <div className={`mb-3 grid size-10 place-items-center rounded-xl ${card.cls}`}>{card.icon}</div>
            <p className="text-3xl font-bold text-violet-deep">{card.value}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Last 30 days trend */}
      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-violet-deep">Traffic — last 30 days</h2>
        <p className="mt-0.5 text-xs text-stone-500">Blue = visits · Green = clicks (hover a bar for details)</p>
        <div className="mt-5 flex h-40 items-end gap-px">
          {data.daily.map((d) => (
            <div
              key={d.date}
              className="group flex h-full flex-1 items-end gap-px"
              title={`${d.date}: ${d.visits} visits · ${d.clicks} clicks`}
            >
              <div
                className="w-1/2 max-w-[8px] rounded-t bg-blue-400 group-hover:bg-blue-500 transition-colors"
                style={{ height: `${Math.max(2, (d.visits / maxTrend) * 100)}%` }}
              />
              <div
                className="w-1/2 max-w-[8px] rounded-t bg-emerald-400/80 group-hover:bg-emerald-500 transition-colors"
                style={{ height: `${Math.max(2, (d.clicks / maxTrend) * 100)}%` }}
              />
            </div>
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-stone-400">
          <span>{data.daily[0]?.date}</span>
          <span>{data.daily[data.daily.length - 1]?.date}</span>
        </div>
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1.6fr_1fr]">
        {/* Popular pages */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-violet-deep">Popular pages</h2>
          <p className="mt-0.5 text-xs text-stone-500">Page views and unique visitors</p>
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-100 text-left text-xs uppercase tracking-wider text-stone-400">
                  <th className="py-2.5 pr-4">Page</th>
                  <th className="py-2.5 pr-4">Visits</th>
                  <th className="py-2.5 pr-4">Visitors</th>
                  <th className="py-2.5">Clicks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-50">
                {data.perPage.slice(0, 12).map((p) => (
                  <tr key={p.path}>
                    <td className="py-3 pr-4 font-mono text-xs text-stone-700">{p.path}</td>
                    <td className="py-3 pr-4 font-bold text-violet-deep">{p.visits.toLocaleString()}</td>
                    <td className="py-3 pr-4 text-stone-500">{p.visitors.toLocaleString()}</td>
                    <td className="py-3 text-stone-500">{p.clicks.toLocaleString()}</td>
                  </tr>
                ))}
                {data.perPage.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-10 text-center text-stone-400">
                      No visits recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-stone-100">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
              style={{ width: `${((data.perPage[0]?.visits ?? 0) / maxVisits) * 100}%` }}
            />
          </div>
        </div>

        {/* Most clicked */}
        <div className="rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
          <h2 className="font-display text-lg font-bold text-violet-deep">Most clicked</h2>
          <p className="mt-0.5 text-xs text-stone-500">Links & buttons people press the most</p>
          <div className="mt-5 space-y-2.5">
            {data.topClicks.slice(0, 10).map((t, i) => (
              <div key={`${t.label}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-stone-50 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-stone-700">{t.label}</p>
                  <p className="truncate font-mono text-xs text-stone-400">{t.path}</p>
                </div>
                <span className="shrink-0 text-sm font-bold text-emerald-600">{t.count.toLocaleString()}</span>
              </div>
            ))}
            {data.topClicks.length === 0 && <p className="text-sm text-stone-400">No link clicks recorded yet.</p>}
          </div>
        </div>
      </div>

      {/* Per-page share */}
      <div className="mt-8 rounded-2xl border border-stone-200 bg-white p-6 shadow-sm">
        <h2 className="font-display text-lg font-bold text-violet-deep">Comparison</h2>
        <div className="mt-5 space-y-4">
          {data.perPage.slice(0, 15).map((p) => (
            <div key={p.path}>
              <div className="mb-1 flex items-center justify-between gap-3 text-sm">
                <span className="truncate font-mono text-xs text-stone-600">{p.path}</span>
                <span className="shrink-0 text-stone-500">{p.visits.toLocaleString()} views</span>
              </div>
              <div className="h-2.5 overflow-hidden rounded-full bg-stone-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-deep to-primary"
                  style={{ width: `${(p.visits / maxVisits) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}