"use client";

import { RotateCcw, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";

export function GameShell({
  title,
  description,
  color = "violet",
  score,
  onRestart,
  children,
}: {
  title: string;
  description: string;
  color?: "violet" | "orange" | "coral" | "green";
  score?: ReactNode;
  onRestart: () => void;
  children: ReactNode;
}) {
  const colors = {
    violet: "from-violet-deep to-primary",
    orange: "from-[#a86d00] to-[#efaa22]",
    coral: "from-[#c55252] to-[#ec8178]",
    green: "from-[#38815a] to-[#65b982]",
  };

  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_24px_60px_-32px_rgba(61,38,153,.55)]">
      <div className={`bg-gradient-to-r ${colors[color]} p-5 text-white sm:p-6`}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.15em] text-white/75">
              <Sparkles className="size-4" /> Mon Petit Hero playroom
            </div>
            <h2 className="font-display text-2xl font-bold sm:text-3xl">{title}</h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-white/80">{description}</p>
          </div>
          {score !== undefined && <div className="rounded-2xl bg-white/15 px-4 py-2 text-center backdrop-blur"><div className="text-[11px] font-bold uppercase tracking-wider text-white/70">Score</div><div className="font-display text-2xl font-bold">{score}</div></div>}
        </div>
      </div>
      <div className="p-4 sm:p-6">
        {children}
        <div className="mt-5 flex justify-end">
          <Button type="button" variant="outline" size="sm" onClick={onRestart} className="rounded-full font-bold">
            <RotateCcw className="size-4" /> Start over
          </Button>
        </div>
      </div>
    </section>
  );
}
