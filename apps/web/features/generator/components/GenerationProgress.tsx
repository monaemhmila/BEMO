"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw,
  BookOpen,
  Image as ImageIcon,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface GenerationProgressProps {
  storyId: string;
  totalPages: number;
  currentStage: "script" | "images" | "audio" | "complete" | "error";
  progress: number;
  completedPages: number;
  failedPages: number;
  onRetry?: (pageId: string) => void;
  onComplete?: () => void;
}

const STAGE_INFO = {
  script: {
    title: "Writing Your Story",
    description: "Our AI author is crafting a personalized adventure...",
    icon: BookOpen,
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  images: {
    title: "Illustrating Pages",
    description: "Creating beautiful, face-consistent illustrations...",
    icon: ImageIcon,
    color: "text-primary",
    bgColor: "bg-buttercup/10",
  },
  audio: {
    title: "Recording Narration",
    description: "Adding voice narration to your story...",
    icon: Volume2,
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  complete: {
    title: "Story Complete!",
    description: "Your personalized storybook is ready to read",
    icon: CheckCircle2,
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
  },
  error: {
    title: "Generation Issue",
    description: "Some pages had trouble. Click to retry.",
    icon: AlertCircle,
    color: "text-red-500",
    bgColor: "bg-red-50",
  },
};

export function GenerationProgress({
  storyId,
  totalPages,
  currentStage,
  progress,
  completedPages,
  failedPages,
  onRetry,
  onComplete,
}: GenerationProgressProps) {
  const [animatedProgress, setAnimatedProgress] = useState(0);
  const stageInfo = STAGE_INFO[currentStage];
  const StageIcon = stageInfo.icon;

  useEffect(() => {
    // Animate progress bar
    const timer = setTimeout(() => {
      setAnimatedProgress(progress);
    }, 100);
    return () => clearTimeout(timer);
  }, [progress]);

  useEffect(() => {
    if (currentStage === "complete" && onComplete) {
      onComplete();
    }
  }, [currentStage, onComplete]);

  return (
    <div className="max-w-lg mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={`rounded-3xl ${stageInfo.bgColor} p-8 text-center`}
      >
        {/* Animated icon */}
        <div className="relative inline-flex mb-6">
          <div
            className={`w-20 h-20 rounded-full ${stageInfo.bgColor} flex items-center justify-center`}
          >
            {currentStage === "complete" ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
              >
                <StageIcon className={`w-10 h-10 ${stageInfo.color}`} />
              </motion.div>
            ) : currentStage === "error" ? (
              <StageIcon className={`w-10 h-10 ${stageInfo.color}`} />
            ) : (
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              >
                <Loader2 className={`w-10 h-10 ${stageInfo.color}`} />
              </motion.div>
            )}
          </div>

          {/* Pulse ring for active states */}
          {currentStage !== "complete" && currentStage !== "error" && (
            <motion.div
              className={`absolute inset-0 rounded-full ${stageInfo.bgColor} opacity-50`}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            />
          )}
        </div>

        {/* Title and description */}
        <h2 className="text-2xl font-display font-bold text-violet-deep mb-2">
          {stageInfo.title}
        </h2>
        <p className="text-muted-foreground mb-6">{stageInfo.description}</p>

        {/* Progress bar */}
        {currentStage !== "complete" && (
          <div className="space-y-2 mb-6">
            <Progress
              value={animatedProgress}
              className="h-3 bg-white/50 [&>div]:bg-gradient-to-r [&>div]:from-primary [&>div]:to-violet-deep"
            />
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>
                {completedPages} of {totalPages} pages
              </span>
              <span>{Math.round(animatedProgress)}%</span>
            </div>
          </div>
        )}

        {/* Page status indicators */}
        {currentStage === "images" && (
          <div className="flex justify-center gap-2 flex-wrap mb-6">
            {Array.from({ length: totalPages }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.1 }}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  i < completedPages
                    ? "bg-emerald-100 text-emerald-600"
                    : i < completedPages + failedPages
                    ? "bg-red-100 text-red-600"
                    : "bg-white text-muted-foreground"
                }`}
              >
                {i < completedPages ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : i < completedPages + failedPages ? (
                  <AlertCircle className="w-4 h-4" />
                ) : (
                  i + 1
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Error retry button */}
        {currentStage === "error" && failedPages > 0 && onRetry && (
          <Button
            onClick={() => onRetry(storyId)}
            className="bg-primary text-white hover:bg-violet-deep"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry Failed Pages
          </Button>
        )}

        {/* Complete action */}
        {currentStage === "complete" && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Button
              className="bg-gradient-to-r from-primary to-violet-deep text-white shadow-lg"
              size="lg"
            >
              <BookOpen className="w-5 h-5 mr-2" />
              Open Storybook
            </Button>
          </motion.div>
        )}

        {/* Fun facts during generation */}
        {currentStage !== "complete" && currentStage !== "error" && (
          <motion.p
            key={Math.floor(Date.now() / 5000)}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground mt-4"
          >
            ✨ Did you know? Each illustration is crafted with your child&apos;s actual
            face for perfect consistency!
          </motion.p>
        )}
      </motion.div>
    </div>
  );
}

export default GenerationProgress;

