"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Image as ImageIcon, Sparkles, Wand2 } from "lucide-react";

const PHASES = [
  { label: "Writing the adventure", icon: BookOpen, color: "text-violet-ink" },
  { label: "Painting the illustrations", icon: ImageIcon, color: "text-[#d05a58]" },
  { label: "Adding a little magic", icon: Sparkles, color: "text-[#b87900]" },
  { label: "Binding your storybook", icon: Wand2, color: "text-[#38815a]" },
];

export function CreationMagicAnimation({ heroName }: { heroName?: string }) {
  const [phase, setPhase] = useState(0);
  const current = PHASES[phase] ?? PHASES[0]!;
  const Icon = current.icon;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setPhase((value) => (value + 1) % PHASES.length);
    }, 3200);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-xl items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 18 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full overflow-hidden rounded-[2rem] border border-buttercup/30 bg-gradient-to-br from-buttercup/20 via-white to-blush/60 p-8 text-center shadow-xl sm:p-12"
      >
        <motion.span
          aria-hidden
          className="absolute left-8 top-10 text-2xl text-primary/50"
          animate={{ y: [-5, 5, -5], rotate: [0, 15, 0], opacity: [0.35, 1, 0.35] }}
          transition={{ duration: 2.5, repeat: Infinity }}
        >
          ✦
        </motion.span>
        <motion.span
          aria-hidden
          className="absolute right-10 top-20 text-xl text-buttercup"
          animate={{ y: [5, -6, 5], rotate: [12, -12, 12], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2.1, repeat: Infinity, delay: 0.4 }}
        >
          ✦
        </motion.span>

        <div className="relative mx-auto mb-7 size-32">
          <motion.div
            className="absolute inset-0 rounded-[2.25rem] border-2 border-dashed border-primary/30"
            animate={{ rotate: 360 }}
            transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
          />
          <motion.div
            className="absolute inset-3 grid place-items-center rounded-[1.75rem] bg-white shadow-lg"
            animate={{ y: [0, -8, 0], rotate: [-2, 2, -2] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          >
            <motion.div
              key={current.label}
              initial={{ opacity: 0, scale: 0.55, rotate: -18 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ type: "spring", bounce: 0.45 }}
              className={current.color}
            >
              <Icon className="size-14" strokeWidth={1.6} aria-hidden />
            </motion.div>
          </motion.div>
        </div>

        <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
          Your story is coming to life
        </p>
        <motion.h2
          key={current.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-3 font-display text-3xl font-bold text-violet-deep"
        >
          {current.label}…
        </motion.h2>
        <p className="mx-auto mt-3 max-w-sm text-muted-foreground">
          {heroName ? `${heroName}'s hero adventure is being made just for them.` : "Your hero adventure is being made just for you."}
        </p>

        <div className="mx-auto mt-8 flex max-w-sm items-center gap-2">
          {PHASES.map((item, index) => (
            <div key={item.label} className="h-2 flex-1 overflow-hidden rounded-full bg-white/80">
              <motion.div
                className={`h-full rounded-full ${index <= phase ? "bg-primary" : "bg-transparent"}`}
                initial={false}
                animate={{ width: index <= phase ? "100%" : "0%" }}
                transition={{ duration: 0.6 }}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs font-semibold text-muted-foreground">
          This can take a few minutes. You can keep this window open while we work.
        </p>
      </motion.div>
    </div>
  );
}
