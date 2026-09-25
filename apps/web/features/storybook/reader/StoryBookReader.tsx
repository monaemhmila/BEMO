"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import HTMLFlipBook from "react-pageflip";
import { useRouter } from "next/navigation";
import { AlertTriangle, RefreshCw } from "lucide-react";

import { BACKEND_URL } from "../../../app/config";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { OrderBookModal } from "../components/OrderBookModal";
import { StoryBookPage } from "./StoryBookPage";
import { StoryBookControls } from "./StoryBookControls";
import { StoryBookLoading } from "./StoryBookLoading";
import { preloadNeighbouringPages, resetPreloadCache } from "./preload";
import type { ReaderStory, FlipPageIndex } from "./types";

import "./reader.css";

interface StoryBookReaderProps {
  storyId: string;
}

/** Artwork is generated at 16:9 - the pages keep that ratio in the online reader. */
const BOOK_WIDTH = 1600;
const BOOK_HEIGHT = 900;

export function StoryBookReader({ storyId }: StoryBookReaderProps) {
  const router = useRouter();
  const { getToken } = useAuth();

  const flipBookRef = useRef<{ pageFlip: () => any } | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTouchRef = useRef<boolean | null>(null);

  const startPage = useMemo<FlipPageIndex>(() => {
    if (typeof window === "undefined") return 0;
    const raw = new URLSearchParams(window.location.search).get("bookPage");
    const parsed = Number.parseInt(raw ?? "", 10);
    return Number.isInteger(parsed) && parsed >= 0 ? parsed : 0;
  }, []);

  const [story, setStory] = useState<ReaderStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const [currentIndex, setCurrentIndex] = useState<FlipPageIndex>(startPage);
  const [exporting, setExporting] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);

  if (isTouchRef.current === null && typeof window !== "undefined") {
    isTouchRef.current =
      matchMedia("(pointer: coarse)").matches || window.innerWidth < 768;
  }

  // ---- Data -------------------------------------------------------------
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchStory = async () => {
      try {
        const token = await getToken?.();
        if (!token) return;

        const res = await axios.get(`${BACKEND_URL}/story/${storyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const nextStory: ReaderStory = res.data.story;
        setStory((prev) =>
          prev && JSON.stringify(prev) === JSON.stringify(nextStory)
            ? prev
            : nextStory
        );
        setLoading(false);
        setError(false);

        if (
          res.data.story.status === "Completed" ||
          res.data.story.status === "Failed"
        ) {
          if (intervalId) clearInterval(intervalId);
        }
      } catch (err) {
        console.error("Failed to fetch story", err);
        setLoading(false);
        setError(true);
        if (intervalId) clearInterval(intervalId);
      }
    };

    fetchStory();
    intervalId = setInterval(fetchStory, 3000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [storyId, getToken]);

  const pages = useMemo(
    () =>
      story
        ? [...story.pages].sort((a, b) => a.pageNumber - b.pageNumber)
        : [],
    [story]
  );

  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (isTouchRef.current) return;
    if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    idleTimerRef.current = setTimeout(() => setControlsVisible(false), 3500);
  }, []);

  // ---- Flip navigation --------------------------------------------------
  /** Latest handler lives in a ref so react-pageflip (which re-subscribes
   *  only when children change) never calls a stale closure. */
  const onFlipRef = useRef<(e: { data: number }) => void>(() => {});
  onFlipRef.current = useCallback(
    (e: { data: number }) => {
      const index = e.data;
      setCurrentIndex(index);
      preloadNeighbouringPages(pages, index);

      const url = new URL(window.location.href);
      if (index > 0) url.searchParams.set("bookPage", String(index));
      else url.searchParams.delete("bookPage");
      window.history.replaceState(null, "", url.toString());

      audioRef.current?.pause();
      setAudioPlaying(false);

      showControls();
    },
    [pages, showControls]
  );

  const goPrev = useCallback(() => {
    if (currentIndex <= 0) return;
    flipBookRef.current?.pageFlip().flipPrev();
  }, [currentIndex]);

  const goNext = useCallback(() => {
    if (currentIndex >= pages.length - 1) return;
    flipBookRef.current?.pageFlip().flipNext();
  }, [currentIndex, pages.length]);

  // ---- Audio -------------------------------------------------------------
  const currentAudioUrl =
    pages[currentIndex + 1]?.audioUrl || pages[currentIndex]?.audioUrl || null;

  useEffect(() => {
    audioRef.current?.pause();
    setAudioPlaying(false);
  }, [currentAudioUrl]);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio || !currentAudioUrl) return;
    if (audioPlaying) {
      audio.pause();
      setAudioPlaying(false);
    } else {
      audio.play().then(
        () => setAudioPlaying(true),
        () => setAudioPlaying(false)
      );
    }
  };

  // ---- Fullscreen / keyboard / idle auto-hide ----------------------------
  const toggleFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      rootRef.current?.requestFullscreen?.().catch(() => {});
    }
  };

  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  useEffect(() => {
    showControls();
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [showControls]);

  // ---- Export PDF / ordering --------------------------------------------
  const handleExportPdf = async () => {
    if (!story) return;
    setExporting(true);
    try {
      const token = await getToken?.();
      const response = await axios.get(`${BACKEND_URL}/storybook/${story.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const pdfUrl = URL.createObjectURL(
        new Blob([response.data], { type: "application/pdf" })
      );
      const download = document.createElement("a");
      download.href = pdfUrl;
      download.download = `${story.title.replace(/[\\/:*?"<>|]/g, "-") || "storybook"}.pdf`;
      download.click();
      URL.revokeObjectURL(pdfUrl);
    } catch (err) {
      console.error("PDF export failed", err);
    } finally {
      setExporting(false);
    }
  };

  // ---- Rendering ----------------------------------------------------------
  const pageLeafs = useMemo(
    () =>
      story
        ? pages.map((page, index) => (
            <StoryBookPage
              key={page.id ?? index}
              page={page}
              title={story.title}
              childName={story.childName}
              dedication={story.dedication}
              side={
                index === 0
                  ? "single"
                  : page.pageNumber % 2 === 1
                    ? "left"
                    : "right"
              }
              isCover={index === 0}
            />
          ))
        : [],
    [pages, story]
  );

  useEffect(() => {
    return () => resetPreloadCache();
  }, []);

  useEffect(() => {
    if (pages.length > 0) {
      preloadNeighbouringPages(pages, Math.min(startPage, pages.length - 1));
    }
  }, [pages, startPage]);

  // ---- States ------------------------------------------------------------
  if (loading && !story) {
    return (
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-paper">
        <StoryBookLoading
          message="Opening your storybook..."
          hint="Fetching the latest pages"
        />
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="flex min-h-[100dvh] w-full flex-col items-center justify-center gap-6 bg-paper px-6 text-center">
        <AlertTriangle className="size-10 text-amber-400" aria-hidden="true" />
        <h1 className="font-display text-2xl font-bold text-violet-deep">
          We couldn&apos;t open this story
        </h1>
        <p className="max-w-sm text-muted-foreground">
          Check your connection and try again.
        </p>
        <Button
          variant="gradient"
          onClick={() => {
            setError(false);
            setLoading(true);
            window.location.reload();
          }}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Try again
        </Button>
        <Button variant="ghost" onClick={() => router.push("/stories")}>
          Back to library
        </Button>
      </div>
    );
  }

  const effectiveStart = Math.min(startPage, Math.max(0, pages.length - 1));

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex w-full flex-col overflow-hidden bg-paper",
        isFullscreen ? "h-[100dvh]" : "min-h-[100dvh]"
      )}
      onPointerDown={showControls}
      onPointerMove={showControls}
      onTouchStart={showControls}
    >
      {/* Soft stage wash behind the book */}
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden="true"
        style={{
          background:
            "radial-gradient(55% 45% at 50% 42%, rgba(124,58,237,0.14), transparent 70%), radial-gradient(40% 32% at 78% 70%, rgba(251,191,36,0.12), transparent 70%)",
        }}
      />

      {pages.length === 0 ? (
        <div className="relative flex flex-1 items-center justify-center">
          <StoryBookLoading
            message={
              story.status === "Failed"
                ? "Some pages did not generate"
                : story.status === "Completed"
                  ? "Preparing your book..."
                  : "Your story is still being written..."
            }
            hint={
              story.status === "Pending" || story.status === "Generating"
                ? "This window refreshes automatically - no need to reload"
                : undefined
            }
          />
        </div>
      ) : (
        <main className="relative flex flex-1 items-center justify-center px-3 pb-20 pt-16 sm:px-12 sm:pb-16 sm:pt-20">
          <div className="relative w-full max-w-5xl xl:max-w-6xl">
            <HTMLFlipBook
              ref={flipBookRef}
              className="story-book-flip"
              style={{}}
              startPage={effectiveStart}
              size="stretch"
              width={BOOK_WIDTH}
              height={BOOK_HEIGHT}
              minWidth={320}
              maxWidth={1000}
              minHeight={360}
              maxHeight={900}
              drawShadow
              flippingTime={900}
              usePortrait
              startZIndex={1}
              autoSize
              maxShadowOpacity={0.5}
              showCover
              mobileScrollSupport
              clickEventForward
              useMouseEvents
              swipeDistance={30}
              showPageCorners
              disableFlipByClick
              onFlip={(e) => onFlipRef.current?.(e)}
            >
              {pageLeafs}
            </HTMLFlipBook>
          </div>
        </main>
      )}

      <StoryBookControls
        title={story.title}
        currentPage={currentIndex + 1}
        totalPages={pages.length}
        visible={controlsVisible}
        isFullscreen={isFullscreen}
        exporting={exporting}
        audio={{
          available: !!currentAudioUrl,
          playing: audioPlaying,
          muted,
          onTogglePlay: toggleAudio,
          onToggleMute: () => setMuted((m) => !m),
        }}
        onPrev={goPrev}
        onNext={goNext}
        onToggleFullscreen={toggleFullscreen}
        onClose={() => router.back()}
        onExportPdf={handleExportPdf}
        onOrderBook={() => setOrderOpen(true)}
      />

      {currentAudioUrl ? (
        <audio
          ref={audioRef}
          src={currentAudioUrl}
          muted={muted}
          preload="none"
          className="hidden"
          onEnded={() => setAudioPlaying(false)}
        />
      ) : null}

      <OrderBookModal
        open={orderOpen}
        onOpenChange={setOrderOpen}
        story={{
          id: story.id,
          title: story.title,
          childName: story.childName ?? undefined,
        }}
      />
    </div>
  );
}