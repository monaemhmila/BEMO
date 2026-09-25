"use client";

import { BookOpen, Loader2 } from "lucide-react";

interface StoryBookLoadingProps {
  message?: string;
  hint?: string;
}

/**
 * Reading-themed loading state: a softly stacked pair of page shapes with a
 * shimmer, so the waiting moment already feels like opening a book.
 */
export function StoryBookLoading({ message, hint }: StoryBookLoadingProps) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-8 px-6">
      <div className="relative" aria-hidden="true">
        {/* Back page */}
        <div className="absolute inset-0 translate-x-2 translate-y-2 rotate-2 rounded-[0.6rem] bg-violet-deep/20" />
        {/* Front page */}
        <div className="relative h-28 w-44 rounded-[0.6rem] border border-border bg-white shadow-inner story-book-skeleton sm:h-36 sm:w-56" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-paper shadow-lg">
            <BookOpen className="size-6 text-violet-deep" />
          </div>
        </div>
      </div>

      <div className="text-center">
        <p className="flex items-center justify-center gap-3 text-lg font-semibold text-violet-deep">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {message ?? "Opening your storybook..."}
        </p>
        {hint ? (
          <p className="mt-2 text-sm text-muted-foreground">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}