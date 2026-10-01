"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { PlayfulShapes } from "@/components/sections/playful-shapes";

const AFTER_IMG = "/before-after/princess-girl.png";
const BEFORE_IMG = "/before-after/normal-girl.png";

export function BeforeAfter() {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const draggingRef = React.useRef(false);
  const [value, setValue] = React.useState(50);

  const updateValue = (clientX: number) => {
    const el = containerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clientX - rect.left;
    setValue(Math.min(100, Math.max(0, (x / rect.width) * 100)));
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    updateValue(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingRef.current) return;
    updateValue(e.clientX);
  };

  const stopDragging = () => {
    draggingRef.current = false;
  };

  return (
    <section className="relative overflow-hidden bg-white py-16 md:py-24">
      <PlayfulShapes tone="light" />
      <div className="shell relative">
        <div className="grid items-center gap-8 pl-0 md:grid-cols-[360px_minmax(0,1fr)] md:gap-10 md:pl-12 lg:grid-cols-2 lg:gap-12">
          {/* Comparison slider */}
          <div className="order-2 flex justify-center md:order-1">
            <div
              ref={containerRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              className="relative aspect-square w-full max-w-[360px] cursor-ew-resize touch-none select-none overflow-hidden rounded-[2rem] border-4 border-white shadow-[0_20px_50px_rgba(44,24,78,0.18)] ring-1 ring-violet-100 lg:max-w-[440px]"
            >
              {/* After (base layer) */}
              <Image
                src={AFTER_IMG}
                alt="A girl as a princess in a flower garden"
                fill
                sizes="(min-width: 1024px) 440px, 360px"
                className="pointer-events-none object-cover select-none"
              />

              {/* Before (revealed on the left of the handle) */}
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
              >
                <div className="relative h-full w-full">
                  <Image
                  src={BEFORE_IMG}
                    alt="A girl in her everyday clothes in a flower garden"
                    fill
                    sizes="(min-width: 1024px) 440px, 360px"
                    className="object-cover select-none"
                  />
                </div>
              </div>

              <span className="absolute left-4 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-violet-deep shadow-sm">
                Before
              </span>
              <span className="absolute right-4 top-4 rounded-full bg-violet-deep/90 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-white shadow-sm">
                After
              </span>

              {/* Drag handle */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0"
                style={{ left: `${value}%` }}
              >
                <div className="absolute inset-y-0 w-0.5 -translate-x-1/2 bg-white" />
                <div className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2">
                  <div className="flex size-10 items-center justify-center rounded-full border-2 border-white bg-[#D9D9D9]/30 shadow backdrop-blur-[16px]">
                    <ChevronLeft className="size-4 text-white" />
                    <ChevronRight className="size-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Keyboard-accessible range control */}
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={Math.round(value)}
                onChange={(e) => setValue(Number(e.target.value))}
                aria-label="Before and after comparison slider"
                className="sr-only"
              />
            </div>
          </div>

          {/* Copy */}
          <div className="order-1 text-center md:order-2 md:pr-6 md:text-left lg:pr-4 xl:pr-0">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-coral md:mb-4">
              From photo to storybook
            </p>
            <h2 className="mx-auto max-w-[340px] font-display text-[20px] leading-[25px] font-semibold tracking-[-0.05px] text-violet-deep md:mx-0 md:max-w-[420px] md:text-[22px] md:leading-[26px] md:tracking-[0.5px] lg:max-w-[500px] lg:text-[28px] lg:leading-[32px] xl:max-w-[500px] xl:text-[36px] xl:leading-[38px]">
              See How a Simple Photo
              <br />
              Becomes a Beautiful Story
            </h2>
            <p className="mx-auto mt-2 max-w-[320px] text-base leading-[21px] tracking-[-0.05px] text-ink/70 md:mx-0 md:mt-4 md:max-w-[420px] md:text-[15px] md:leading-[21px] lg:max-w-[400px] lg:text-[18px] lg:leading-[24px] xl:max-w-[443px] xl:text-xl xl:leading-[26px]">
              A simple photo becomes a magical gift, bringing their imagined character to life.
            </p>
            <p className="mt-5 text-sm font-semibold text-violet-deep/70">
              Drag the handle to reveal the transformation.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
