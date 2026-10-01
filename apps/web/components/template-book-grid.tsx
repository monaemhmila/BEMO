import type { ReactNode } from "react";
import Link from "next/link";

import { TemplateBookCover } from "@/components/template-book-cover";
import { LocalizedStoryText } from "@/components/localized-story-text";
import type { StoryTemplate } from "@/data/story-templates";

const PRICE_FROM = "";
const PRICE = "70 DT";

/** Hinge position as % of cover width. Tweak this one number. */
const HINGE = 5.5;

const spineGradient = `linear-gradient(90deg,
  rgba(255,255,255,.38) 0%,
  rgba(255,255,255,.14) 0.7%,
  rgba(0,0,0,.06) 1.8%,
  rgba(0,0,0,.16) ${HINGE - 1.6}%,
  rgba(0,0,0,.55) ${HINGE - 0.35}%,
  rgba(0,0,0,.35) ${HINGE}%,
  rgba(255,255,255,.34) ${HINGE + 0.55}%,
  rgba(255,255,255,.06) ${HINGE + 1.2}%,
  rgba(0,0,0,.30) ${HINGE + 2}%,
  rgba(0,0,0,.14) ${HINGE + 5}%,
  rgba(0,0,0,.04) ${HINGE + 10}%,
  transparent ${HINGE + 15}%)`;

const sheenGradient = `linear-gradient(115deg,
  rgba(255,255,255,.20) 0%,
  rgba(255,255,255,0) 35%,
  rgba(255,255,255,0) 65%,
  rgba(0,0,0,.14) 100%)`;

const edgeGradient = `linear-gradient(180deg, rgba(255,255,255,.14), transparent 6%, transparent 94%, rgba(0,0,0,.18)),
  linear-gradient(270deg, rgba(0,0,0,.16), transparent 3%)`;

/** Wraps a cover image so it looks like a hardcover book with a hinged spine. */
function BookFrame({ children }: { children: ReactNode }) {
  return (
    <div className="relative w-full pb-[6px] pr-[5px]">
      {/* Page block: paper thickness visible on the right and bottom */}
      <div
        aria-hidden
        className="absolute bottom-0 left-[3%] right-0 top-[1.2%] rounded-r-[10px] rounded-bl-[3px]"
        style={{
          background: "repeating-linear-gradient(90deg,#f4f1ea 0 1px,#ddd8cc 1px 2px)",
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

        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: edgeGradient }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: sheenGradient }} />
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: spineGradient }} />

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
      {templates.map((template) => (
        <TemplateBookCard key={template.slug} template={template} />
      ))}
    </div>
  );
}
