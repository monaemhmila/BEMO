"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const AFTER_IMG =
  "https://resources.wonderwraps.com/47702d06-01a7-457d-9706-9d5ae2e2eed7/img/books/before-after/after.webp";
const BEFORE_IMG =
  "https://resources.wonderwraps.com/47702d06-01a7-457d-9706-9d5ae2e2eed7/img/books/before-after/before.webp";

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
    <section className="py-14 md:py-20">
      <div className="mx-auto max-w-5xl">
        <div className="grid items-center gap-8 pl-0 md:grid-cols-[360px_minmax(0,1fr)] md:gap-10 md:pl-12 lg:grid-cols-2 lg:gap-12">
          {/* Comparison slider */}
          <div className="order-2 flex justify-center md:order-1">
            <div
              ref={containerRef}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={stopDragging}
              onPointerCancel={stopDragging}
              className="relative aspect-square w-full max-w-[360px] cursor-ew-resize touch-none select-none overflow-hidden rounded-2xl shadow-lg lg:max-w-[440px]"
            >
              {/* After (base layer) */}
              <img
                src={AFTER_IMG}
                alt="After"
                draggable={false}
                className="pointer-events-none absolute inset-0 h-full w-full object-cover select-none"
              />

              {/* Before (revealed on the left of the handle) */}
              <div
                className="pointer-events-none absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - value}% 0 0)` }}
              >
                <img
                  src={BEFORE_IMG}
                  alt="Before"
                  draggable={false}
                  className="h-full w-full object-cover select-none"
                />
              </div>

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
            <h2 className="mx-auto max-w-[340px] font-display text-[20px] leading-[25px] font-semibold tracking-[-0.05px] text-black md:mx-0 md:max-w-[420px] md:text-[22px] md:leading-[26px] md:tracking-[0.5px] lg:max-w-[500px] lg:text-[28px] lg:leading-[32px] xl:max-w-[500px] xl:text-[36px] xl:leading-[38px]">
              See How a Simple Photo
              <br />
              Becomes a Beautiful Story
            </h2>
            <p className="mx-auto mt-1 max-w-[320px] text-base leading-[21px] tracking-[-0.05px] text-black md:mx-0 md:mt-3 md:max-w-[420px] md:text-[15px] md:leading-[21px] lg:max-w-[400px] lg:text-[18px] lg:leading-[24px] xl:max-w-[443px] xl:text-xl xl:leading-[26px]">
              A simple photo becomes a magical gift, bringing their imagined
              character to life.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}