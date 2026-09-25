"use client";

import { forwardRef, useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";
import type { ReaderPage, PageSide } from "./types";
import { StoryBookCover } from "./StoryBookCover";
import { drawSquareHalfOnCanvas } from "./split16x9InBrowser";

interface StoryBookPageProps {
  page: ReaderPage;
  /** Current story metadata surfaced on the cover. */
  title: string;
  childName?: string | null;
  dedication?: string | null;
  side: PageSide;
  isCover: boolean;
  /** When set, this leaf renders a square crop of that half of the 16:9 image instead of the full image. */
  squareHalf?: "left" | "right";
  /** Page number printed on the leaf; defaults to the source page number. */
  leafNumber?: number;
  /** When false the story text overlay is hidden (right halves carry only the artwork, like the print). */
  renderText?: boolean;
}

type ImageState = "loading" | "loaded" | "error";

/**
 * A single leaf of the flipbook. Must be a component that forwards a ref -
 * react-pageflip clones every direct child and attaches a ref to it, then moves
 * the DOM nodes into the internal page stack.
 *
 * The engine drives page sizing, transforms and visibility through inline
 * styles / classes (`.stf__item--soft|hard`, `--left|--right`), so all visual
 * styling here lives in CSS classes (see reader.css), never on `style`.
 */
export const StoryBookPage = forwardRef<HTMLDivElement, StoryBookPageProps>(
  function StoryBookPage(
    { page, title, childName, dedication, side, isCover, squareHalf, leafNumber, renderText = true },
    ref
  ) {
    const imageUrl = page.imageUrl ?? "";
    const [imageState, setImageState] = useState<ImageState>(imageUrl ? "loading" : "error");
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      setImageState(imageUrl ? "loading" : "error");
    }, [imageUrl]);

    useEffect(() => {
      if (!squareHalf) return;
      if (!imageUrl) {
        setImageState("error");
        return;
      }
      let cancelled = false;
      const source = new Image();
      source.decoding = "async";
      source.onload = () => {
        if (cancelled) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        setImageState(drawSquareHalfOnCanvas(source, squareHalf, canvas) ? "loaded" : "error");
      };
      source.onerror = () => {
        if (!cancelled) setImageState("error");
      };
      source.src = imageUrl;
      return () => {
        cancelled = true;
        source.onload = null;
        source.onerror = null;
      };
    }, [imageUrl, squareHalf]);

    return (
      <div
        ref={ref}
        data-density={isCover ? "hard" : "soft"}
        className={cn(
          "story-book-page",
          isCover && "is-cover",
          side === "left" && "is-left",
          side === "right" && "is-right",
          side === "single" && "is-single"
        )}
        aria-label={isCover ? title : page.content}
        role="img"
      >
        {/* Artwork */}
        <div className="absolute inset-0 story-book-art">
          {squareHalf ? (
            <canvas
              ref={canvasRef}
              aria-hidden="true"
              className={cn(
                "absolute inset-0 size-full select-none",
                imageState !== "loaded" && "opacity-0"
              )}
            />
          ) : imageUrl ? (
            <img
              src={imageUrl}
              alt={isCover ? `Cover of ${title}` : ""}
              loading={page.pageNumber <= 2 ? "eager" : "lazy"}
              decoding="async"
              draggable={false}
              onLoad={() => setImageState("loaded")}
              onError={() => setImageState("error")}
              className={cn(
                "absolute inset-0 size-full select-none object-cover",
                imageState !== "loaded" && "opacity-0"
              )}
            />
          ) : null}

          {imageState !== "loaded" ? (
            <div className="absolute inset-0 story-book-skeleton" aria-hidden="true" />
          ) : null}

          {imageState === "error" ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 story-book-art-fallback">
              <ImageOff className="size-[10cqw] max-h-12 opacity-50" aria-hidden="true" />
              <p className="max-w-[80%] text-center text-[clamp(0.5rem,1.6cqw,0.9rem)] text-violet-deep/70">
                {isCover ? "Cover artwork is on its way" : "This picture is still being drawn"}
              </p>
            </div>
          ) : null}
        </div>

        {/* Cover typography sits on top of the cover artwork */}
        {isCover ? (
          <StoryBookCover
            title={title}
            childName={childName}
            dedication={dedication}
          />
        ) : null}

        {/* Story text mirroring the printed page layout */}
        {!isCover && renderText && page.content ? (
          <div
            className={cn(
              "story-book-caption",
              side === "left" && "align-left",
              side === "right" && "align-right",
              side === "single" && "align-center"
            )}
          >
            <p className="font-display">{page.content}</p>
          </div>
        ) : null}

        {/* Page number, like a real finished book */}
        {!isCover ? (
          <span className="story-book-page-number" aria-hidden="true">
            {leafNumber ?? page.pageNumber}
          </span>
        ) : null}
      </div>
    );
  }
);