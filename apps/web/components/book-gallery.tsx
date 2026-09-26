"use client";

import * as React from "react";
import { BookOpen, Pause, Play } from "lucide-react";

import { cn } from "@/lib/utils";
import type { StoryMedia } from "@/data/story-templates";

interface BookGalleryProps {
  slides: StoryMedia[];
  alt: string;
}

function FillerSlide({ index, compact }: { index: number; compact?: boolean }) {
  if (compact) {
    return (
      <span className="flex size-full items-center justify-center bg-muted/70">
        <BookOpen aria-hidden className="size-5 text-muted-foreground/70" />
      </span>
    );
  }

  return (
    <span className="flex size-full flex-col items-center justify-center gap-3 bg-muted/60 text-muted-foreground">
      <span className="flex size-16 items-center justify-center rounded-2xl border border-border bg-white/70">
        <BookOpen aria-hidden className="size-7" />
      </span>
      <span className="text-sm font-semibold">Preview {index + 1}</span>
    </span>
  );
}

function VideoFrame({
  slide,
  alt,
  isActive,
  className,
}: {
  slide: StoryMedia;
  alt: string;
  isActive: boolean;
  className?: string;
}) {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(true);
  const [isHovered, setIsHovered] = React.useState(false);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isActive) {
      video.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }, [isActive]);

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().then(() => setIsPlaying(true)).catch(() => undefined);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  return (
    <div
      className={cn("relative flex size-full cursor-pointer items-center justify-center", className)}
      onClick={togglePlayback}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <video
        ref={videoRef}
        className="max-h-full max-w-full object-contain transition-opacity duration-500"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-label={alt}
      >
        <source src={slide.src} type={slide.mimeType ?? "video/mp4"} />
      </video>

      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div
          className={cn(
            "rounded-full bg-gray-100 p-1 transition-opacity duration-200",
            isHovered ? "opacity-100" : "opacity-0",
          )}
        >
          {isPlaying ? (
            <Pause aria-hidden className="size-6 text-gray-500" />
          ) : (
            <Play aria-hidden className="size-6 text-gray-500" />
          )}
        </div>
      </div>
    </div>
  );
}

function ArrowIcon({ direction }: { direction: "prev" | "next" }) {
  return (
    <svg width="20" height="11" viewBox="0 0 20 11" fill="none" aria-hidden>
      {direction === "prev" ? (
        <path
          d="M0.488254 6.07526C0.582611 5.89382 0.73574 5.75283 0.933082 5.70026C3.51308 3.71929 6.0095 1.93675 8.90843 0.409784C9.649 0.0196845 10.275 1.13148 9.54305 1.548C7.56586 2.67355 5.7976 3.91178 4.05685 5.25866C7.0539 5.1786 10.0671 5.33119 13.0523 5.53527C14.9381 5.66413 14.9004 5.61034 16.7797 5.812C18.1456 6.00463 18.1487 6.01077 18.8156 6.28015C19.2143 6.41387 19.1407 6.98217 18.7177 7.00508C18.7436 7.00734 18.5596 7.06277 18.342 7.00508C16.5139 6.88269 14.6839 6.79992 12.8528 6.73306C9.91697 6.62577 6.96278 6.54677 4.02504 6.69909C6.23839 7.54885 8.36277 8.48137 10.4952 9.67809C11.2304 10.0906 10.5732 11.1846 9.83286 10.8004C6.92746 9.2923 4.05738 8.2754 0.944133 7.29031C0.624936 7.18921 0.454284 6.9579 0.399827 6.70098C0.322725 6.49663 0.335126 6.27125 0.488254 6.07526Z"
          fill="#02243D"
        />
      ) : (
        <path
          d="M19.2559 6.07709C19.1611 5.89495 19.0074 5.7534 18.8093 5.70063C16.2193 3.71197 13.7132 1.9225 10.803 0.389594C10.0595 -0.00202131 9.4311 1.1141 10.1659 1.53224C12.1508 2.66216 13.9259 3.90521 15.6734 5.25732C12.6647 5.17694 9.63976 5.33012 6.64297 5.535C4.74984 5.66436 4.78772 5.61037 2.90109 5.8128C1.52987 6.00618 1.52678 6.01235 0.85732 6.28277C0.457044 6.41701 0.530928 6.98752 0.955562 7.01053C0.929535 7.01279 1.11431 7.06843 1.33275 7.01053C3.16796 6.88766 5.00506 6.80457 6.84324 6.73745C9.79051 6.62974 12.7562 6.55044 15.7053 6.70335C13.4834 7.55641 11.3507 8.49255 9.20999 9.69392C8.47195 10.108 9.13177 11.2063 9.87495 10.8206C12.7916 9.30663 15.6729 8.28578 18.7982 7.29686C19.1187 7.19537 19.29 6.96316 19.3446 6.70524C19.422 6.5001 19.4096 6.27384 19.2559 6.07709Z"
          fill="#02243D"
        />
      )}
    </svg>
  );
}

export function BookGallery({ slides, alt }: BookGalleryProps) {
  const [current, setCurrent] = React.useState(0);
  const hasMultiple = slides.length > 1;

  const goTo = (index: number) => {
    setCurrent((index + slides.length) % slides.length);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!hasMultiple) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goTo(current - 1);
    }
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goTo(current + 1);
    }
  };

  return (
    <div
      className="flex items-start gap-4"
      role="group"
      aria-roledescription="carousel"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {hasMultiple && (
        <div className="no-scrollbar hidden max-h-[526px] flex-col gap-4 overflow-y-auto pr-1 lg:flex lg:h-[526px]">
          {slides.map((slide, index) => (
            <button
              key={slide.src + index}
              type="button"
              onClick={() => setCurrent(index)}
              aria-label={`Show ${slide.type === "video" ? "video" : "image"} ${index + 1}`}
              aria-current={current === index}
              className={cn(
                "relative size-20 shrink-0 overflow-hidden rounded-md border-2 transition",
                current === index ? "border-purple-500" : "border-transparent",
              )}
            >
              {slide.placeholder ? (
                <FillerSlide index={index} compact />
              ) : slide.type === "image" ? (
                <img
                  src={slide.src}
                  alt="Thumbnail"
                  loading="lazy"
                  decoding="async"
                  className="size-full object-cover"
                />
              ) : (
                <>
                  <video
                    className="size-full object-cover"
                    muted
                    playsInline
                    preload="metadata"
                    aria-hidden
                  >
                    <source src={slide.src} type={slide.mimeType ?? "video/mp4"} />
                  </video>
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                    <Play aria-hidden className="size-6 text-white drop-shadow-lg" />
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      )}

      <div className="relative aspect-square w-full overflow-hidden rounded-md md:mx-auto md:h-[560px] md:w-[560px] lg:h-[526px] lg:w-[526px]">
        <div
          className="flex size-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${current * 100}%)` }}
        >
          {slides.map((slide, index) => (
            <div
              key={slide.src + index}
              className="flex size-full shrink-0 items-center justify-center"
              aria-hidden={current !== index}
            >
              {slide.placeholder ? (
                <FillerSlide index={index} />
              ) : slide.type === "image" ? (
                <img
                  src={slide.src}
                  alt={`${alt} — page ${index + 1}`}
                  width={526}
                  height={526}
                  loading={index === 0 ? "eager" : "lazy"}
                  decoding="async"
                  className="max-h-full max-w-full object-contain transition-opacity duration-500"
                />
              ) : (
                <VideoFrame slide={slide} alt={`${alt} preview video`} isActive={current === index} />
              )}
            </div>
          ))}
        </div>

        {hasMultiple && (
          <>
            <button
              type="button"
              onClick={() => goTo(current - 1)}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 z-50 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow transition hover:bg-gray-50"
            >
              <ArrowIcon direction="prev" />
            </button>
            <button
              type="button"
              onClick={() => goTo(current + 1)}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 z-50 flex size-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 shadow transition hover:bg-gray-50"
            >
              <ArrowIcon direction="next" />
            </button>

            <div className="absolute bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2">
              {slides.map((slide, index) => (
                <button
                  key={slide.src + index}
                  type="button"
                  onClick={() => setCurrent(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  aria-current={current === index}
                  className={cn(
                    "size-2 rounded-full transition-opacity",
                    current === index ? "bg-[#02243D] opacity-100" : "bg-[#02243D] opacity-25",
                  )}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
