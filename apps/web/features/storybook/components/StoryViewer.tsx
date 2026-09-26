"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
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
  RotateCcw,
  Maximize2,
  ShoppingCart,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { BACKEND_URL } from "../../../app/config";
import { GenerationProgress } from "@/features/generator";
import { OrderBookModal } from "./OrderBookModal";
import { handleImageError } from "@/components/ui/image-fallback";

interface StoryPage {
  id: string;
  pageNumber: number;
  content: string;
  imageUrl?: string;
  audioUrl?: string;
  status: string;
}

interface Story {
  id: string;
  title: string;
  status: "Pending" | "Generating" | "Completed" | "Failed";
  childName?: string;
  dedication?: string;
  pages: StoryPage[];
  model: {
    name: string;
    thumbnail?: string;
  };
  progress?: number;
  generatedPages?: number;
  failedPages?: number;
  totalPages?: number;
}

interface StoryViewerProps {
  storyId: string;
}

export function StoryViewer({ storyId }: StoryViewerProps) {
  const router = useRouter();
  const { getToken } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);

  const [story, setStory] = useState<Story | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoPlay, setAutoPlay] = useState(false);
  const [orderOpen, setOrderOpen] = useState(false);

  const currentPage = story?.pages[currentPageIndex];
  const isLastPage = !!story && currentPageIndex === story.pages.length - 1;

  // Fetch story with polling for generating state
  useEffect(() => {
    const fetchStory = async () => {
      try {
        const token = await getToken?.();
        if (!token) return;

        const res = await axios.get(`${BACKEND_URL}/story/${storyId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        setStory(res.data.story);
        setLoading(false);

        // Stop polling if story is complete or failed
        if (
          res.data.story.status === "Completed" ||
          res.data.story.status === "Failed"
        ) {
          clearInterval(intervalId);
        }
      } catch (error) {
        console.error("Failed to fetch story", error);
        setLoading(false);
      }
    };

    fetchStory();
    const intervalId = setInterval(fetchStory, 3000);

    return () => clearInterval(intervalId);
  }, [storyId, getToken]);

  // Auto-play audio when page changes
  useEffect(() => {
    if (autoPlay && audioRef.current && currentPage?.audioUrl) {
      audioRef.current.play();
      setIsPlaying(true);
    }
  }, [currentPageIndex, autoPlay, currentPage?.audioUrl]);

  // Handle audio end - auto advance to next page
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleEnded = () => {
      setIsPlaying(false);
      if (autoPlay && !isLastPage) {
        setTimeout(() => setCurrentPageIndex((p) => p + 1), 500);
      }
    };

    audio.addEventListener("ended", handleEnded);
    return () => audio.removeEventListener("ended", handleEnded);
  }, [autoPlay, currentPageIndex, isLastPage, currentPage?.audioUrl]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-primary">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!story) {
    return (
      <div className="h-screen flex items-center justify-center bg-muted">
        <div className="text-center">
          <h2 className="text-2xl font-display text-violet-deep mb-4">
            Story not found
          </h2>
        <Button onClick={() => router.push("/storybook/dashboard")}>
          Back to Dashboard
        </Button>
        </div>
      </div>
    );
  }

  // Show generation progress if still generating
  if (story.status === "Generating" || story.status === "Pending") {
    const completedPages = story.pages.filter(
      (p) => p.status === "Generated"
    ).length;
    const failedPages = story.pages.filter((p) => p.status === "Failed").length;
    const progress = story.pages.length
      ? Math.round((completedPages / story.pages.length) * 100)
      : 0;

    return (
      <div className="min-h-screen bg-paper flex items-center justify-center p-4">
        <GenerationProgress
          storyId={story.id}
          totalPages={story.pages.length}
          currentStage={failedPages > 0 ? "error" : "images"}
          progress={progress}
          completedPages={completedPages}
          failedPages={failedPages}
          onRetry={async () => {
            const token = await getToken?.();
            await axios.post(
              `${BACKEND_URL}/story/${story.id}/retry-page`,
              { pageId: story.pages.find((p) => p.status === "Failed")?.id },
              { headers: { Authorization: `Bearer ${token}` } }
            );
          }}
        />
      </div>
    );
  }

  const isFirstPage = currentPageIndex === 0;

  const handleExportPdf = async () => {
    if (!story) return;
    setExporting(true);

    try {
      const token = await getToken?.();
      const response = await axios.get(`${BACKEND_URL}/storybook/${story.id}/pdf`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: "blob",
      });
      const pdfUrl = URL.createObjectURL(new Blob([response.data], { type: "application/pdf" }));
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

  const togglePlay = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className={`h-screen bg-primary flex flex-col ${
        isFullscreen ? "fixed inset-0 z-50" : ""
      }`}
    >
      {/* Top Navigation */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between gap-2 z-50 bg-gradient-to-b from-black/50 to-transparent">
        <Button
          variant="ghost"
          className="text-white/80 hover:text-white hover:bg-white/10 shrink-0"
          onClick={() => router.push("/storybook/dashboard")}
        >
          <Home className="w-5 h-5 mr-2" />
          <span className="hidden sm:inline">Dashboard</span>
        </Button>

        <h1 className="flex-1 min-w-0 font-display font-bold text-lg sm:text-xl text-white/90 tracking-wide text-center truncate px-1">
          {story.title}
        </h1>

        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={toggleFullscreen}
          >
            <Maximize2 className="w-5 h-5" />
          </Button>

          {story.status === "Completed" && (
            <Button
              variant="gradient"
              className="text-white px-2 sm:px-4"
              onClick={() => setOrderOpen(true)}
            >
              <ShoppingCart className="w-4 h-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Order My Book</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        {/* Previous Button */}
        <button
          onClick={() => setCurrentPageIndex((p) => p - 1)}
          disabled={isFirstPage}
          className={`absolute left-2 sm:left-4 z-20 p-2 sm:p-4 rounded-full transition-all ${
            isFirstPage
              ? "opacity-30 cursor-not-allowed"
              : "bg-black/20 hover:bg-black/40 text-white"
          }`}
        >
          <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        {/* Book Pages */}
        <div className="w-full max-w-6xl aspect-[4/5] sm:aspect-[16/9] relative">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPageIndex}
              initial={{ opacity: 0, rotateY: -10 }}
              animate={{ opacity: 1, rotateY: 0 }}
              exit={{ opacity: 0, rotateY: 10 }}
              transition={{ duration: 0.4 }}
              className="w-full h-full bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col sm:flex-row"
              style={{ perspective: "1000px" }}
            >
              {/* Top: Image (stacks above text on mobile) */}
              <div className="w-full h-1/2 bg-muted relative shrink-0 sm:w-1/2 sm:h-full">
                {currentPage?.imageUrl ? (
                  <img
                    src={currentPage.imageUrl}
                    alt={`Page ${currentPage?.pageNumber ?? currentPageIndex + 1}`}
                    className="w-full h-full object-cover"
                    onError={handleImageError}
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-buttercup/15 to-blush/40">
                    <div className="text-center">
                      <Loader2 className="w-12 h-12 animate-spin text-buttercup mx-auto mb-3" />
                      <p className="text-violet-deep font-medium">
                        Illustrating...
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Bottom: Text */}
              <div className="w-full h-1/2 p-6 sm:w-1/2 sm:h-full sm:p-8 md:p-12 flex flex-col justify-center bg-paper relative">
                {/* Decorative book binding */}
                <div className="absolute left-0 top-0 bottom-0 w-1 sm:w-4 bg-gradient-to-r from-muted to-transparent" />

                <div className="overflow-y-auto font-display text-lg sm:text-xl md:text-2xl lg:text-3xl leading-relaxed text-foreground">
                  {currentPage?.content}
                </div>

                {/* Page number */}
                <div className="absolute bottom-4 sm:bottom-6 left-0 right-0 text-center">
                  <span className="text-muted-foreground text-sm font-sans">
                    Page {currentPageIndex + 1} of {story.pages.length}
                  </span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next Button */}
        <button
          onClick={() => setCurrentPageIndex((p) => p + 1)}
          disabled={isLastPage}
          className={`absolute right-2 sm:right-4 z-20 p-2 sm:p-4 rounded-full transition-all ${
            isLastPage
              ? "opacity-30 cursor-not-allowed"
              : "bg-black/20 hover:bg-black/40 text-white"
          }`}
        >
          <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      </div>

      {/* Audio Controls */}
      {currentPage?.audioUrl && (
        <audio ref={audioRef} src={currentPage.audioUrl} muted={isMuted} />
      )}

      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
        <div className="max-w-md mx-auto flex items-center justify-center gap-4">
          {/* Mute toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="text-white/80 hover:text-white hover:bg-white/10"
            onClick={() => setIsMuted(!isMuted)}
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>

          {/* Play/Pause */}
          {currentPage?.audioUrl && (
            <Button
              variant="ghost"
              size="icon"
              className="text-white hover:text-white hover:bg-white/10 w-12 h-12"
              onClick={togglePlay}
            >
              {isPlaying ? (
                <Pause className="w-6 h-6" />
              ) : (
                <Play className="w-6 h-6" />
              )}
            </Button>
          )}

          {/* Auto-play toggle */}
          <Button
            variant="ghost"
            className={`text-sm ${
              autoPlay
                ? "text-buttercup hover:text-buttercup"
                : "text-white/60 hover:text-white"
            }`}
            onClick={() => setAutoPlay(!autoPlay)}
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Auto-play {autoPlay ? "On" : "Off"}
          </Button>
        </div>

        {/* Page dots */}
        <div className="flex justify-center gap-2 mt-4">
          {story.pages.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrentPageIndex(i)}
              className={`w-2 h-2 rounded-full transition-all ${
                i === currentPageIndex
                  ? "bg-buttercup w-6"
                  : "bg-white/40 hover:bg-white/60"
              }`}
            />
          ))}
        </div>
      </div>

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

export default StoryViewer;

