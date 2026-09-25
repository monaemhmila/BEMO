"use client";

import { BookOpen } from "lucide-react";

interface StoryBookCoverProps {
  title: string;
  childName?: string | null;
  dedication?: string | null;
}

/**
 * The visual "outside cover" overlay. The generated cover artwork stays the
 * hero; the existing BEMO title system is drawn on top, just like the printed
 * book - never burned into the AI image.
 */
export function StoryBookCover({ title, childName, dedication }: StoryBookCoverProps) {
  return (
    <div className="absolute inset-0">
      {/* Scrim so the title stays readable over any artwork */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />

      <div className="absolute top-[7%] inset-x-0 text-center px-[8%]">
        <h2 className="font-display font-bold text-white text-[clamp(1rem,4.2cqw,2.2rem)] leading-tight [text-shadow:0_2px_12px_rgba(0,0,0,0.7)]">
          {title}
        </h2>
        {childName && (
          <p className="mt-[1.4cqw] text-buttercup font-semibold uppercase tracking-[0.28em] text-[clamp(0.45rem,1.5cqw,0.85rem)] [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
            Starring {childName}
          </p>
        )}
      </div>

      <div className="absolute bottom-[4%] inset-x-0 text-center px-[8%]">
        {dedication ? (
          <p className="font-display italic text-white/90 text-[clamp(0.55rem,1.8cqw,1rem)] leading-snug [text-shadow:0_1px_8px_rgba(0,0,0,0.7)]">
            “{dedication}”
          </p>
        ) : (
          <span className="inline-flex items-center gap-2 rounded-full bg-black/35 px-[2%] py-[0.8cqw] text-white/90 tracking-[0.3em] uppercase text-[clamp(0.4rem,1.2cqw,0.75rem)]">
            <BookOpen className="inline-block size-[1.2em]" aria-hidden="true" />
            StoryBook AI
          </span>
        )}
      </div>
    </div>
  );
}