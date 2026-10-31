"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";

import { TemplateBookCover } from "@/components/template-book-cover";
import { LocalizedStoryText } from "@/components/localized-story-text";
import type { StoryTemplate } from "@/data/story-templates";

const PRICE_FROM = "";
const PRICE = "70 DT";

/** Wraps a cover image so it looks like a hardcover book with a hinged spine. */
function BookFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full pb-[6px] pr-[5px]">
      {/* Page block: paper thickness visible on the right and bottom */}
      <div
        aria-hidden
        className="absolute bottom-0 left-[3%] right-0 top-[1.2%] rounded-r-[10px] rounded-bl-[3px]"
        style={{
          background: "#fffaf0",
          boxShadow: "inset 0 -1px 0 rgba(0,0,0,.25)",
        }}
      />

      {/* Cover */}
      <div
        className="relative overflow-hidden rounded-l-[4px] rounded-r-[9px] transition-all duration-500 group-hover:-translate-y-1"
        style={{
          boxShadow:
            "0 1px 1px rgba(0,0,0,.25), 0 6px 10px -2px rgba(31,22,54,.30), 0 24px 34px -14px rgba(31,22,54,.55)",
        }}
      >
        {children}

        <div aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-[5.5%] bg-[#07549d]/25" />
        <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-[2%] bg-[#14324a]/10" />

        {/* Fine edge highlight, like laminated board */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-l-[4px] rounded-r-[9px] ring-1 ring-inset ring-white/20"
        />
      </div>

      {/* Ground shadow that grows on hover */}
      <div
        aria-hidden
        className="absolute -bottom-2 left-[6%] right-[4%] -z-10 h-4 rounded-full bg-black/40 blur-xl transition-all duration-500 group-hover:-bottom-4 group-hover:bg-black/30 group-hover:blur-2xl"
      />
    </div>
  );
}

/**
 * A catalogue card. Tapping a story opens that story's detail page, where the
 * "Personalise my book" button starts the wizard with this story selected.
 */
export function TemplateBookCard({ template }: { template: StoryTemplate }) {
  return (
    <Link href={`/books/${template.slug}`} className="group block">
      <div className="relative mx-auto flex h-full w-full max-w-[357.67px] flex-col items-start space-y-4 pb-6 md:pb-8 lg:mx-0 lg:max-w-none lg:w-full xl:w-[390px]">
        <div className="relative w-full xl:w-[390px]">
          <BookFrame>
            <TemplateBookCover template={template} className="!rounded-none !shadow-none" />
          </BookFrame>
        </div>

        <div className="flex w-full flex-1 flex-col">
          <div className="grow">
            <span className="block text-left font-display text-[17px] font-semibold text-violet-deep line-clamp-2 md:text-[20px] md:line-clamp-1">
              <LocalizedStoryText
                templateId={template.slug}
                field="title"
                fallback={template.title}
                translations={template.translations}
              />
            </span>

            <span className="mt-1 block text-left text-[14px] leading-relaxed text-muted-foreground line-clamp-2 md:text-[16px]">
              <LocalizedStoryText
                templateId={template.slug}
                field="tagline"
                fallback={template.tagline}
                translations={template.translations}
              />
            </span>
          </div>
        </div>

        <div className="mt-3 flex w-full items-center justify-between gap-3 md:mt-2">
          <div className="flex items-center gap-1.5 whitespace-nowrap md:gap-2">
            <span className="text-[20px] font-medium leading-[32px] tracking-[-0.3px] text-muted-foreground md:text-[16px] md:leading-[28px] lg:text-[22px] lg:leading-[44px]">
              {PRICE_FROM}
            </span>
            <span className="text-[20px] font-bold leading-[20px] tracking-[-0.05px] text-primary md:text-[18px] lg:text-[22px]">
              {PRICE}
            </span>
          </div>

          <span className="whitespace-nowrap rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            Ages {template.ageRange}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function TemplateBookGrid({ templates }: { templates: StoryTemplate[] }) {
  return (
    <div className="mt-10 grid w-full grid-cols-1 gap-y-7 md:grid-cols-2 md:gap-[21px] lg:grid-cols-3 lg:gap-[21px] xl:grid-cols-[repeat(3,390px)] xl:justify-between xl:gap-x-0">
      <AnimatePresence mode="popLayout">
        {templates.map((template, index) => (
          <motion.div
            key={template.slug}
            layout
            initial={{ opacity: 0, y: 28, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -18, scale: 0.94 }}
            transition={{ duration: 0.55, delay: Math.min(index * 0.08, 0.45), ease: "easeOut" }}
          >
            <TemplateBookCard template={template} />
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
