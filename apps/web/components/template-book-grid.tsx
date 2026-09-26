import Link from "next/link";

import { CATEGORY_META, type StoryTemplate } from "@/data/story-templates";

const PRICE_FROM = "From";
const PRICE = "$34.99";

export function TemplateBookCard({ template }: { template: StoryTemplate }) {
  return (
    <Link
      href={{ pathname: "/storybook/create", query: { templateId: template.slug } }}
      className="group block"
    >
      <div className="relative mx-auto flex h-full w-full max-w-[357.67px] flex-col items-start space-y-4 pb-6 md:pb-8 lg:mx-0 lg:max-w-none lg:w-full xl:w-[390px]">
        <div className="relative w-full xl:w-[390px]">
          <div className="absolute right-2 top-2 z-10 md:-right-2 md:-top-4">
            <span className="flex h-[38px] min-w-[74px] items-center justify-center rounded-full bg-white/95 px-3 text-center text-[13px] font-bold uppercase tracking-wide text-violet-deep shadow-md md:h-[46px] md:min-w-[92px] md:text-[15px]">
              {template.emoji} {CATEGORY_META[template.category].label}
            </span>
          </div>

          <div
            className={`relative aspect-square w-full overflow-hidden rounded-tr-md rounded-br-md bg-zinc-100 shadow-[0_18px_40px_-24px_rgba(31,22,54,.45)] xl:h-[390px] xl:w-[390px] xl:aspect-auto ${CATEGORY_META[template.category].accent}`}
          >
            <img
              src={template.coverImage}
              alt={`${template.title} cover`}
              width={390}
              height={390}
              loading="lazy"
              decoding="async"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          </div>
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
