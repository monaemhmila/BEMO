"use client";

import { Suspense } from "react";
import { StoryGenerator } from "@/features/generator";
import { useTrials } from "@/hooks/use-trials";
import { Sparkles } from "lucide-react";

export default function StorybookCreatePage() {
  const { trials, loading: trialsLoading } = useTrials();

  return (
    <div className="py-8">
      <header className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-buttercup/20 to-blush/40 rounded-full border border-buttercup/40">
            <Sparkles className="w-5 h-5 text-primary" />
            <span className="font-bold text-violet-deep">
              {trialsLoading ? "..." : trials}
            </span>
            <span className="text-primary text-sm">
              free {trials === 1 ? "story" : "stories"} left
            </span>
          </div>
        </div>
        <p className="text-sm uppercase tracking-[0.3em] text-primary mb-2">
          Create
        </p>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-violet-deep mb-4">
          Create Your Child&apos;s Next Adventure
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Choose your hero, pick a theme — we&apos;ll handle the
          rest: script, illustrations, and narration. Every printed book you
          order unlocks one more free story.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        }
      >
        <StoryGenerator />
      </Suspense>
    </div>
  );
}
