"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import axios from "axios";
import HTMLFlipBook from "react-pageflip";
import { useRouter } from "next/navigation";
import { AlertTriangle, Lock, RefreshCw, ShoppingBag } from "lucide-react";

import { BACKEND_URL } from "../../../app/config";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { OrderBookModal } from "../components/OrderBookModal";
import { StoryBookPage } from "./StoryBookPage";
import { StoryBookControls } from "./StoryBookControls";
import { StoryBookLoading } from "./StoryBookLoading";
import { preloadNeighbouringPages, resetPreloadCache } from "./preload";
import type { ReaderStory, FlipPageIndex, PageSide } from "./types";

import "./reader.css";

interface StoryBookReaderProps {
  storyId: string;
  /**
   * Teaser mode. The book is truncated to the first `previewLimit` pages, so the
   * reader physically cannot flip past the free ones, and reaching the last
   * page surfaces the "Order now" call to action. Omit to show the whole book.
   */
  previewLimit?: number;
  /**
   * Renders the book as an inline panel of bounded height instead of a
   * full-viewport reader. Used by the post-generation teaser.
   */
  embedded?: boolean;
}

/** One story page is printed as TWO square leaves (left + right halves of the
 *  16:9 image). The book keeps that square per-leaf ratio in the reader. */
const BOOK_WIDTH = 900;
const BOOK_HEIGHT = 900;

export function StoryBookReader({ storyId, previewLimit, embedded = false }: StoryBookReaderProps) {
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
  const [slowGenerating, setSlowGenerating] = useState(false);

  const [currentLeaf, setCurrentLeaf] = useState<FlipPageIndex>(startPage);
  const pendingStartRef = useRef<number | null>(null);
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
    const controller = new AbortController();
    const connect = async () => {
      try {
        const token = await getToken?.();
        if (!token) {
          setLoading(false);
          setError(true);
          return;
        }

        const response = await fetch(`${BACKEND_URL}/story/events/${storyId}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: "text/event-stream" },
          signal: controller.signal,
        });
        if (!response.ok || !response.body) throw new Error(`Story stream failed: ${response.status}`);

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!controller.signal.aborted) {
          const chunk = await reader.read();
          if (chunk.done) break;
          buffer += decoder.decode(chunk.value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const event of events) {
            const data = event.split("\n").find((line) => line.startsWith("data: "))?.slice(6);
            if (!data || data === "{}") continue;
            const parsed = JSON.parse(data) as { story?: ReaderStory };
            if (!parsed.story) continue;
            const nextStory = parsed.story;
            setStory((prev) => prev && JSON.stringify(prev) === JSON.stringify(nextStory) ? prev : nextStory);
            setLoading(false);
            setError(false);

            const isTerminal = nextStory.status === "Completed" || nextStory.status === "Failed";
            if (isTerminal && nextStory.pages.length === 0) setError(true);
            if (isTerminal) {
              pendingStartRef.current = null;
              setSlowGenerating(false);
            } else {
              if (pendingStartRef.current === null) pendingStartRef.current = Date.now();
              if (Date.now() - pendingStartRef.current > 90000) setSlowGenerating(true);
            }
          }
        }
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Failed to fetch story", err);
        setLoading(false);
        setError(true);
      }
    };

    void connect();
    return () => {
      controller.abort();
    };
  }, [storyId, getToken]);

  const sortedPages = useMemo(
    () =>
      story
        ? [...story.pages].sort((a, b) => a.pageNumber - b.pageNumber)
        : [],
    [story]
  );

  /**
   * In teaser mode the flipbook is built from the free pages only, so the
   * locked pages are not merely hidden behind an overlay - they are never
   * mounted as leaves and cannot be reached by dragging or by `bookPage`.
   */
  const pages = useMemo(
    () =>
      previewLimit && previewLimit > 0
        ? sortedPages.slice(0, previewLimit)
        : sortedPages,
    [sortedPages, previewLimit]
  );

  /** How many pages sit behind the paywall, for the call-to-action copy. */
  const hiddenPageCount = sortedPages.length - pages.length;

  /** Each source page produces two square leaves (left + right halves). The
 *  cover (first) and closing (last) pages are generated 1:1 and stay ONE
 *  square page. */
  const leafCount = useMemo(() => {
    if (!story) return 0;
    if (pages.length <= 1) return pages.length;
    return (pages.length - 2) * 2 + 2;
  }, [story, pages]);

  /**
   * True once the reader has flipped onto the last free page in teaser mode.
   * This is where the paywall call to action takes over from the book.
   */
  const atPreviewEnd =
    !!previewLimit && pages.length > 0 && currentLeaf >= leafCount - 1;

  /** Map a flipbook leaf index back to its source page index. */
  const sourceIndexForLeaf = useCallback(
    (leafIndex: number): number => {
      const n = pages.length;
      if (n <= 1) return 0;
      if (leafIndex <= 0) return 0;
      if (leafIndex >= leafCount - 1) return n - 1;
      return 1 + Math.floor((leafIndex - 1) / 2);
    },
    [pages.length, leafCount]
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
      setCurrentLeaf(index);
      preloadNeighbouringPages(pages, sourceIndexForLeaf(index));

      const url = new URL(window.location.href);
      if (index > 0) url.searchParams.set("bookPage", String(index));
      else url.searchParams.delete("bookPage");
      window.history.replaceState(null, "", url.toString());

      audioRef.current?.pause();
      setAudioPlaying(false);

      showControls();
    },
    [pages, sourceIndexForLeaf, showControls]
  );

  const goPrev = useCallback(() => {
    if (currentLeaf <= 0) return;
    flipBookRef.current?.pageFlip().flipPrev();
  }, [currentLeaf]);

  const goNext = useCallback(() => {
    if (currentLeaf >= leafCount - 1) return;
    flipBookRef.current?.pageFlip().flipNext();
  }, [currentLeaf, leafCount]);

  // ---- Audio -------------------------------------------------------------
  const currentSourceIndex = sourceIndexForLeaf(currentLeaf);
  const currentAudioUrl =
    pages[currentSourceIndex + 1]?.audioUrl ||
    pages[currentSourceIndex]?.audioUrl ||
    null;

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
  /** Physical side within a spread follows the leaf position in the book:
   *  the cover sits alone, then leaves pair up as [left, right]. */
  const leafSide = (leafIndex: number): PageSide =>
    leafIndex === 0 ? "single" : leafIndex % 2 === 1 ? "left" : "right";

  const pageLeafs = useMemo(() => {
    if (!story) return [];
    const leaves: ReactNode[] = [];
    const n = pages.length;
    pages.forEach((page, sourceIndex) => {
      const isSingleSquare = sourceIndex === 0 || sourceIndex === n - 1;
      const leafIndex = leaves.length;
      if (isSingleSquare) {
        leaves.push(
          <StoryBookPage
            key={`${page.id}-s`}
            page={page}
            title={story.title}
            childName={story.childName}
            dedication={story.dedication}
            squareFill
            side={leafSide(leafIndex)}
            isCover={sourceIndex === 0}
            renderText={sourceIndex !== 0}
            leafNumber={leafIndex + 1}
          />
        );
        return;
      }
      leaves.push(
        <StoryBookPage
          key={`${page.id}-l`}
          page={page}
          title={story.title}
          childName={story.childName}
          dedication={story.dedication}
          squareHalf="left"
          side={leafSide(leafIndex)}
          isCover={false}
          renderText
          leafNumber={leafIndex + 1}
        />
      );
      leaves.push(
        <StoryBookPage
          key={`${page.id}-r`}
          page={page}
          title={story.title}
          childName={story.childName}
          dedication={story.dedication}
          squareHalf="right"
          side={leafSide(leafIndex + 1)}
          isCover={false}
          renderText={false}
          leafNumber={leafIndex + 2}
        />
      );
    });
    return leaves;
  }, [pages, story]);

  useEffect(() => {
    return () => resetPreloadCache();
  }, []);

  useEffect(() => {
    if (pages.length > 0 && leafCount > 0) {
      const startLeaf = Math.min(startPage, leafCount - 1);
      preloadNeighbouringPages(pages, sourceIndexForLeaf(startLeaf));
    }
  }, [pages, startPage, leafCount, sourceIndexForLeaf]);

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
        <Button variant="ghost" onClick={() => router.push("/storybook/dashboard")}>
          Back to my books
        </Button>
      </div>
    );
  }

  const effectiveStart = Math.min(startPage, Math.max(0, leafCount - 1));

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex w-full flex-col overflow-hidden bg-paper",
        embedded
          ? "h-[70vh] min-h-[420px]"
          : isFullscreen
            ? "h-[100dvh]"
            : "min-h-[100dvh]"
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
                ? slowGenerating
                  ? "This is taking longer than usual - keep this page open and your story will appear"
                  : "This window refreshes automatically - no need to reload"
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
              maxWidth={640}
              minHeight={320}
              maxHeight={640}
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

            {atPreviewEnd && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm sm:p-6">
                <div className="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl">
                  <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-deep/10">
                    <Lock className="h-7 w-7 text-violet-deep" />
                  </div>
                  <h3 className="font-display text-2xl font-bold text-violet-deep">
                    {hiddenPageCount > 0
                      ? `${hiddenPageCount} more ${
                          hiddenPageCount === 1 ? "page" : "pages"
                        } inside`
                      : "The story continues"}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">
                    You&apos;ve reached the end of the free preview. Order the
                    printed book to read the whole adventure.
                  </p>
                  <Button
                    onClick={() => setOrderOpen(true)}
                    className="mt-5 w-full rounded-full bg-primary py-6 font-bold text-white transition-colors hover:bg-violet-deep"
                  >
                    <ShoppingBag className="mr-2 h-5 w-5" />
                    Order now
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      )}

      <StoryBookControls
        title={story.title}
        currentPage={currentLeaf + 1}
        totalPages={leafCount}
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
        embedded={embedded}
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
