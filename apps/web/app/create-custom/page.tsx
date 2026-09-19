"use client";

import { Suspense } from "react";
import { PenLine, Sparkles } from "lucide-react";
import { CustomStoryGenerator } from "@/features/custom-story/components/CustomStoryGenerator";
import { useTrials } from "@/hooks/use-trials";

export default function CreateCustomStoryPage() {
  const { trials, loading: trialsLoading } = useTrials();

  return (
    <div className="py-8">
      <header className="mb-12 text-center">
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-buttercup/40 bg-gradient-to-r from-buttercup/20 to-blush/40 px-4 py-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="font-bold text-violet-deep">
              {trialsLoading ? "..." : trials}
            </span>
            <span className="text-sm text-primary">
              free {trials === 1 ? "story" : "stories"} left
            </span>
          </div>
        </div>
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-buttercup/40 bg-gradient-to-r from-buttercup/20 to-blush/40 px-4 py-2">
            <PenLine className="h-5 w-5 text-primary" />
            <span className="text-sm text-primary">No templates — your idea, your story</span>
          </div>
        </div>
        <p className="mb-2 text-sm text-primary uppercase tracking-[0.3em]">
          Create · Free-Style
        </p>
        <h1 className="mb-4 font-display text-4xl font-bold text-violet-deep md:text-5xl">
          Write Your Own Child&apos;s Story
        </h1>
        <p className="mx-auto max-w-2xl text-muted-foreground">
          No theme pickers, no templates. Describe any story you can imagine in
          your own words, upload your child&apos;s photo, and we&apos;ll turn it into a
          personalized, illustrated book where your child is the hero.
        </p>
      </header>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-24">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        }
      >
        <CustomStoryGenerator />
      </Suspense>
    </div>
  );
}