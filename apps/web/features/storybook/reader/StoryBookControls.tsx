"use client";

import {
  ChevronLeft,
  ChevronRight,
  Download,
  Loader2,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  ShoppingBag,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface AudioControlProps {
  available: boolean;
  playing: boolean;
  muted: boolean;
  onTogglePlay: () => void;
  onToggleMute: () => void;
}

interface StoryBookControlsProps {
  title: string;
  currentPage: number;
  totalPages: number;
  visible: boolean;
  isFullscreen: boolean;
  exporting: boolean;
  audio: AudioControlProps;
  onPrev: () => void;
  onNext: () => void;
  onToggleFullscreen: () => void;
  onClose: () => void;
  onExportPdf: () => void;
  onOrderBook: () => void;
}

/** Chrome around the flipbook - logical controls, never visual clutter. */
export function StoryBookControls({
  title,
  currentPage,
  totalPages,
  visible,
  isFullscreen,
  exporting,
  audio,
  onPrev,
  onNext,
  onToggleFullscreen,
  onClose,
  onExportPdf,
  onOrderBook,
}: StoryBookControlsProps) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-30 transition-opacity duration-500",
        visible ? "opacity-100" : "opacity-0"
      )}
      inert={!visible}
    >
      {/* Edge turn zones */}
      <Button
        variant="ghost"
        size="icon"
        onClick={onPrev}
        aria-label="Previous page"
        className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-auto size-12 rounded-full bg-paper/70 text-violet-deep shadow-lg backdrop-blur-sm hover:bg-paper active:scale-95 cx-edge-btn"
      >
        <ChevronLeft className="size-6" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        onClick={onNext}
        aria-label="Next page"
        className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-auto size-12 rounded-full bg-paper/70 text-violet-deep shadow-lg backdrop-blur-sm hover:bg-paper active:scale-95 cx-edge-btn"
      >
        <ChevronRight className="size-6" />
      </Button>

      {/* Top bar */}
      <div className="absolute inset-x-0 top-0 flex justify-center px-3 pt-3">
        <div className="pointer-events-auto flex max-w-full items-center gap-1 rounded-full border border-white/40 bg-violet-deep/85 px-2 py-1.5 text-white shadow-xl backdrop-blur-md sm:gap-2 sm:px-3">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-full text-white hover:bg-white/20"
            onClick={onClose}
            aria-label="Back to library"
          >
            <X className="size-4" />
          </Button>

          <div className="max-w-[40vw] truncate px-1 font-display text-sm font-semibold sm:max-w-xs sm:text-base">
            {title}
          </div>
          <span className="hidden rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium whitespace-nowrap sm:inline-block">
            {currentPage} / {totalPages}
          </span>

          <div className="ml-1 flex items-center gap-0.5 sm:gap-1">
            {audio.available ? (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-white hover:bg-white/20"
                  onClick={audio.onToggleMute}
                  aria-label={audio.muted ? "Unmute narration" : "Mute narration"}
                >
                  {audio.muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 rounded-full text-white hover:bg-white/20"
                  onClick={audio.onTogglePlay}
                  aria-label={audio.playing ? "Pause narration" : "Play narration"}
                >
                  {audio.playing ? <Pause className="size-4" /> : <Play className="size-4" />}
                </Button>
              </>
            ) : null}

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-white hover:bg-white/20"
              onClick={onExportPdf}
              disabled={exporting}
              aria-label="Download PDF"
              title="Download PDF"
            >
              {exporting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="hidden size-8 rounded-full text-white hover:bg-white/20 sm:inline-flex"
              onClick={onOrderBook}
              aria-label="Order a printed book"
              title="Order printed book"
            >
              <ShoppingBag className="size-4" />
            </Button>

            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-full text-white hover:bg-white/20"
              onClick={onToggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}