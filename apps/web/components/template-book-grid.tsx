import Link from "next/link";

import { TemplateBookCover } from "@/components/template-book-cover";
import type { StoryTemplate } from "@/data/story-templates";

const PRICE_FROM = "From";
const PRICE = "$34.99";

export function TemplateBookCard({ template }: { template: StoryTemplate }) {
  return (
    <Link href={`/books/${template.slug}`} className="group block">
      <div className="relative mx-auto flex h-full w-full max-w-[357.67px] flex-col items-start space-y-4 pb-6 md:pb-8 lg:mx-0 lg:max-w-none lg:w-full xl:w-[390px]">
        <div className="relative w-full transition-transform duration-500 group-hover:-translate-y-1 xl:w-[390px]">
          <TemplateBookCover
            template={template}
            className="transition-shadow duration-500 group-hover:shadow-[0_40px_70px_-30px_rgba(31,22,54,.65)]"
          />
        </div>

        <div className="flex w-full flex-1 flex-col">
          <div className="grow">
            <span className="block text-left font-display text-[17px] font-semibold text-violet-deep line-clamp-2 md:text-[20px] md:line-clamp-1">
              {template.title}
            </span>

            <span className="mt-1 block text-left text-[14px] leading-relaxed text-muted-foreground line-clamp-2 md:text-[16px]">
              {template.tagline}
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
