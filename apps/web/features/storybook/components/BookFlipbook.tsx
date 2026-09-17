"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import axios from "axios";
import {
  ChevronLeft,
  ChevronRight,
  Home,
  Download,
  Loader2,
  Volume2,
  VolumeX,
  Play,
  Pause,
  ShoppingCart,
  BookOpen,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { BACKEND_URL } from "../../../app/config";
import { GenerationProgress } from "@/features/generator";
import { OrderBookModal } from "./OrderBookModal";
import { handleImageError } from "@/components/ui/image-fallback";

interface FlipbookPage {
  id: string;
  pageNumber: number;
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  status: string;
}

interface FlipbookStory {
  id: string;
  title: string;
  status: "Pending" | "Generating" | "Completed" | "Failed";
  childName?: string;
  dedication?: string;
  pages: FlipbookPage[];
  model: {
    name: string;
    thumbnail?: string;
  };
}

/** An open-book spread: a left sheet, a right sheet, and its label. */
interface Spread {
  left: FlipbookPage | null; // null = decorated endpaper (inside cover)
  right: FlipbookPage | null;
  label: string;
}

/**
 * Lay the story out like a real book: the cover stands alone on the right
 * sheet, then every two story pages share a spread (2|3, 4|5, …) so the text
 * falls bottom-left / bottom-right exactly like the printed PDF.
 */
function buildSpreads(pages: FlipbookPage[]): Spread[] {
  const spreads: Spread[] = [];
  const [cover, ...rest] = pages;
  if (cover) {
    spreads.push({ left: null, right: cover, label: "Cover" });
  }
  for (let i = 0; i < rest.length; i += 2) {
    const left = rest[i] ?? null;
    const right = rest[i + 1] ?? null;
    const label = left
      ? right
        ? `Pages ${left.pageNumber}–${right.pageNumber}`
        : `Page ${left.pageNumber}`
      : "";
    spreads.push({ left, right, label });
  }
  return spreads;
}

/** One physical sheet of the open book. */
function PageSheet({
  page,
  side,
  story,
  showSpineEdge,
}: {
  page: FlipbookPage | null;
  side: "left" | "right";
  story: FlipbookStory;
  showSpineEdge: boolean;
}) {
  const isCover = page?.pageNumber === 1;
  const hasImage = !!page?.imageUrl;

  return (
    <div
      className={`relative flex-1 bg-[#FFF9F0] overflow-hidden ${
        side === "left" ? "rounded-l-lg" : "rounded-r-lg"
      }`}
    >
      {page && hasImage ? (
        <img
          src={page.imageUrl}
          alt={`Page ${page.pageNumber}`}
          onError={handleImageError}
          decoding="async"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : page && isCover ? (
        <div className="absolute inset-0 bg-gradient-to-br from-amber-100 via-orange-50 to-rose-100" />
      ) : (
        <div className="absolute inset-0 bg-[#FFF9F0]" />
      )}

      {/* Cover layout */}
      {page && isCover && (
        <>
          <div className="absolute inset-0 bg-gradient-to-b from-black/45 via-transparent to-black/55" />
          <div className="absolute top-8 inset-x-4 text-center px-4">
            <h2 className="font-serif text-2xl md:text-4xl font-bold text-white [text-shadow:0_2px_10px_rgba(0,0,0,0.65)]">
              {story.title}
            </h2>
            {story.childName && (
              <p className="mt-2 text-amber-200 text-xs md:text-sm font-semibold uppercase tracking-[0.25em] [text-shadow:0_1px_6px_rgba(0,0,0,0.6)]">
                Starring {story.childName}
              </p>
            )}
          </div>
          <div className="absolute bottom-5 inset-x-0 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-black/35 text-white/90 text-[10px] md:text-xs tracking-[0.3em] uppercase">
              StoryBook AI
            </span>
          </div>
        </>
      )}

      {/* Endpaper (inside cover, left of the cover page) */}
      {!page && (
        <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center">
          {story.dedication ? (
            <p className="font-serif italic text-stone-600 text-sm md:text-lg leading-relaxed">
              “{story.dedication}”
            </p>
          ) : (
            <>
              <BookOpen className="w-8 h-8 text-amber-300/70 mb-3" />
              <p className="font-serif italic text-stone-400 text-xs md:text-sm">
                A personalized adventure
              </p>
            </>
          )}
        </div>
      )}

      {/* Story text overlay — mirrors the printed PDF composition */}
      {page && !isCover && page.content && (
        <>
          <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent" />
          <p
            className={`absolute bottom-9 text-white text-[11px] md:text-sm leading-relaxed [text-shadow:0_2px_6px_rgba(0,0,0,0.9)] ${
              side === "left" ? "left-5 right-10" : "right-5 left-10"
            }`}
          >
            {page.content}
          </p>
        </>
      )}

      {/* Page number */}
      {page && (
        <div className="absolute bottom-2.5 inset-x-0 text-center">
          <span
            className={`text-[10px] md:text-xs ${
              hasImage ? "text-white/80 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]" : "text-stone-400"
            }`}
          >
            {page.pageNumber}
          </span>
        </div>
      )}

      {/* Curvature shading toward the spine / outer edge */}
      <div
        className={`pointer-events-none absolute inset-y-0 w-10 ${
          showSpineEdge
            ? side === "left"
              ? "right-0 bg-gradient-to-l from-black/25 to-transparent"
              : "left-0 bg-gradient-to-r from-black/25 to-transparent"
            : side === "left"
              ? "left-0 bg-gradient-to-r from-black/10 to-transparent"
              : "right-0 bg-gradient-to-l from-black/10 to-transparent"
        }`}
      />
    </div>
  );
}

export function BookFlipbook({ storyId }: { storyId: string }) {
  const router = useRouter();
  const { getToken } = useAuth();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [story, setStory] = useState<FlipbookStory | null>(null);
  const [loading, setLoading] = useState(true);
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [exporting, setExporting] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);
  const [audioPlaying, setAudioPlaying] = useState(false);
  const [muted, setMuted] = useState(false);

  // Fetch story with polling for the generating state
  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const fetchStory = async () => {
      try {
        const token = await getToken?.();
        if (!token) return;

        const res = await axios.get(`${BACKEND_URL}/story/${storyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setStory(res.data.story);
        setLoading(false);

        if (res.data.story.status === "Completed" || res.data.story.status === "Failed") {
          if (intervalId) clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Failed to fetch story", error);
        setLoading(false);
      }
    };

    fetchStory();
    intervalId = setInterval(fetchStory, 3000);
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [storyId, getToken]);

  const pages = useMemo(
    () => (story ? [...story.pages].sort((a, b) => a.pageNumber - b.pageNumber) : []),
    [story]
  );
  const spreads = useMemo(() => buildSpreads(pages), [pages]);
  const spread: Spread =
    spreads[spreadIndex] ?? { left: null, right: null, label: "" };

  const stopAudio = useCallback(() => {
    audioRef.current?.pause();
    setAudioPlaying(false);
  }, []);

  const goNext = useCallback(() => {
    if (spreadIndex >= spreads.length - 1) return;
    setDirection(1);
    setSpreadIndex((i) => i + 1);
    stopAudio();
  }, [spreadIndex, spreads.length, stopAudio]);

  const goPrev = useCallback(() => {
    if (spreadIndex <= 0) return;
    setDirection(-1);
    setSpreadIndex((i) => i - 1);
    stopAudio();
  }, [spreadIndex, stopAudio]);

  // Keyboard navigation, like leafing through a real book
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") goNext();
      if (e.key === "ArrowLeft") goPrev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev]);

  const currentAudioUrl = spread?.right?.audioUrl || spread?.left?.audioUrl || null;

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      setAudioPlaying(false);
    }
  }, [currentAudioUrl]);

  const toggleAudio = () => {
    const audio = audioRef.current;
    if (!audio || !currentAudioUrl) return;
    if (audioPlaying) {
      audio.pause();
      setAudioPlaying(false);
    } else {
      // play() rejects when autoplay is blocked — keep the UI in sync instead
      // of leaving an unhandled promise rejection in the console.
      audio.play().then(
        () => setAudioPlaying(true),
        () => setAudioPlaying(false)
      );
    }
  };

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
    } catch (error) {
      console.error("PDF export failed", error);
    } finally {
      setExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-900">
        <Loader2 className="w-12 h-12 animate-spin text-amber-500" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <div className="text-center">
          <h2 className="text-2xl font-serif text-stone-900 mb-4">Story not found</h2>
          <Button onClick={() => router.push("/stories")}>Return to Library</Button>
        </div>
      </div>
    );
  }

  // Show generation progress if still generating
  if (story.status === "Generating" || story.status === "Pending") {
    const completedPages = pages.filter((p) => p.status === "Generated").length;
    const failedPages = pages.filter((p) => p.status === "Failed").length;
    const progress = pages.length ? Math.round((completedPages / pages.length) * 100) : 0;

    return (
      <div className="min-h-screen bg-stone-50 flex items-center justify-center p-4">
        <GenerationProgress
          storyId={story.id}
          totalPages={pages.length}
          currentStage={failedPages > 0 ? "error" : "images"}
          progress={progress}
          completedPages={completedPages}
          failedPages={failedPages}
          onRetry={async () => {
            const token = await getToken?.();
            await axios.post(
              `${BACKEND_URL}/story/${story.id}/retry-page`,
              { pageId: pages.find((p) => p.status === "Failed")?.id },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }}
        />
      </div>
    );
  }

  if (spreads.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-stone-100">
        <Button onClick={() => router.push("/stories")}>Return to Library</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-stone-900 via-stone-800 to-stone-900 flex flex-col">
      {/* Toolbar */}
      <div className="px-4 py-3 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
          onClick={() => router.push("/stories")}
        >
          <Home className="w-4 h-4 mr-2" /> Library
        </Button>
        <p className="hidden md:block font-serif text-white/90 truncate px-4">{story.title}</p>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={exporting}
            className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
            onClick={handleExportPdf}
          >
            <Download className={`w-4 h-4 mr-2 ${exporting ? "animate-bounce" : ""}`} />
            {exporting ? "Preparing…" : "PDF"}
          </Button>
          <Button
            size="sm"
            className="bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full shadow-lg shadow-amber-900/30"
            onClick={() => setOrderOpen(true)}
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Order Book
          </Button>
        </div>
      </div>

      {/* Book */}
      <div className="flex-1 flex items-center justify-center px-3 pb-2 min-h-0">
        <button
          onClick={goPrev}
          disabled={spreadIndex === 0}
          aria-label="Previous page"
          className={`z-20 p-3 rounded-full transition-all shrink-0 ${
            spreadIndex === 0
              ? "opacity-25 cursor-default text-white/40"
              : "bg-black/30 hover:bg-black/50 text-white"
          }`}
        >
          <ChevronLeft className="w-7 h-7" />
        </button>

        <div className="flex-1 max-w-6xl mx-2 md:mx-6" style={{ perspective: "2400px" }}>
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={spreadIndex}
              custom={direction}
              initial={{ rotateY: direction > 0 ? -22 : 22, opacity: 0.35, x: direction > 0 ? 60 : -60 }}
              animate={{ rotateY: 0, opacity: 1, x: 0 }}
              exit={{ rotateY: direction > 0 ? 22 : -22, opacity: 0.35, x: direction > 0 ? -60 : 60 }}
              transition={{ duration: 0.45, ease: "easeInOut" }}
              style={{ transformStyle: "preserve-3d", transformPerspective: 2400 }}
              className="relative flex aspect-[2/1.15] w-full rounded-xl bg-[#e8e0d2] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.65)] ring-1 ring-black/20"
            >
              <PageSheet
                page={spread.left ?? null}
                side="left"
                story={story}
                showSpineEdge={!!spread.right}
              />

              {/* Center spine */}
              {spread.left && spread.right && (
                <div className="pointer-events-none absolute inset-y-0 left-1/2 -translate-x-1/2 w-8 bg-gradient-to-r from-transparent via-black/30 to-transparent" />
              )}
              {!spread.left && (
                <div className="pointer-events-none absolute inset-y-0 left-0 w-4 bg-gradient-to-r from-black/20 to-transparent" />
              )}
              {!spread.right && spread.left && (
                <div className="pointer-events-none absolute inset-y-0 right-0 w-4 bg-gradient-to-l from-black/20 to-transparent" />
              )}

              <PageSheet
                page={spread.right ?? null}
                side="right"
                story={story}
                showSpineEdge={!!spread.left}
              />
            </motion.div>
          </AnimatePresence>
        </div>

        <button
          onClick={goNext}
          disabled={spreadIndex >= spreads.length - 1}
          aria-label="Next page"
          className={`z-20 p-3 rounded-full transition-all shrink-0 ${
            spreadIndex >= spreads.length - 1
              ? "opacity-25 cursor-default text-white/40"
              : "bg-black/30 hover:bg-black/50 text-white"
          }`}
        >
          <ChevronRight className="w-7 h-7" />
        </button>
      </div>

      {/* Footer controls */}
      <div className="px-4 pb-5 pt-2">
        <div className="max-w-2xl mx-auto flex items-center justify-center gap-4">
          {currentAudioUrl && (
            <>
              <Button
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                onClick={() => setMuted(!muted)}
              >
                {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="text-white hover:bg-white/10 rounded-full"
                onClick={toggleAudio}
              >
                {audioPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              </Button>
            </>
          )}
          <div className="text-center">
            <p className="text-white/50 text-xs font-medium tracking-wide">
              {spread?.label || "Cover"} · {spreadIndex + 1} / {spreads.length}
            </p>
            <div className="flex justify-center gap-1.5 mt-2">
              {spreads.map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setDirection(i > spreadIndex ? 1 : -1);
                    setSpreadIndex(i);
                    stopAudio();
                  }}
                  aria-label={`Go to spread ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === spreadIndex ? "bg-amber-400 w-5" : "bg-white/25 hover:bg-white/50 w-1.5"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>
        <p className="text-center text-white/25 text-[10px] mt-3">
          Use ← → keys or click the arrows to turn the pages
        </p>
      </div>

      {currentAudioUrl && <audio ref={audioRef} src={currentAudioUrl} muted={muted} />}

      {/* Preload the neighbouring spreads so page turns feel instant */}
      {[spreads[spreadIndex + 1], spreads[spreadIndex - 1]].map((neighbour, i) =>
        [neighbour?.left?.imageUrl, neighbour?.right?.imageUrl]
          .filter((url): url is string => !!url)
          .map((url) => (
            <img
              key={`${i}-${url}`}
              src={url}
              alt=""
              aria-hidden="true"
              className="pointer-events-none absolute h-0 w-0 overflow-hidden opacity-0"
            />
          ))
      )}

      {story.status === "Completed" && (
        <OrderBookModal
          open={orderOpen}
          onOpenChange={setOrderOpen}
          story={{ id: story.id, title: story.title, childName: story.childName }}
        />
      )}
    </div>
  );
}

export default BookFlipbook;