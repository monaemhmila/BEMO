"use client";

import Link from "next/link";

import { TemplateBookCard } from "@/components/template-book-grid";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { type StoryTemplate } from "@/data/story-templates";
import { cn } from "@/lib/utils";
import { PlayfulShapes } from "@/components/sections/playful-shapes";

type StoryRailProps = {
  eyebrow: string;
  title: string;
  templates: StoryTemplate[];
  viewAllHref?: string;
  className?: string;
};

/**
 * Storefront shelf of real story templates. Each card opens the story's detail
 * page, where the "Personalise my book" button starts the create wizard with
 * that template already selected.
 */
export function StoryRail({
  eyebrow,
  title,
  templates,
  viewAllHref = "/books",
  className,
}: StoryRailProps) {
  return (
    <section className={cn("relative overflow-hidden py-12 lg:py-16", className)}>
      <PlayfulShapes tone={className?.includes("bg-paper") ? "paper" : "light"} />
      <div className="shell relative">
        <div className="animate-reveal-up flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold tracking-wide text-primary">
              {eyebrow}
            </p>
            <h2 className="mt-1 font-display text-3xl font-bold text-violet-deep sm:text-4xl">
              {title}
            </h2>
          </div>
          <Button asChild variant="outline" className="rounded-full border-2 font-bold">
            <Link href={viewAllHref}>View all</Link>
          </Button>
        </div>

        <Carousel
          opts={{ align: "start", loop: true }}
          className="mt-8 [&_[data-slot=carousel-content]]:-ml-4"
        >
          <CarouselContent>
            {templates.map((template, i) => (
              <CarouselItem
                key={`${template.slug}-${i}`}
                className="animate-story-card basis-[85%] pl-4 sm:basis-1/2 lg:basis-1/3"
              >
                <TemplateBookCard template={template} />
              </CarouselItem>
            ))}
          </CarouselContent>
          <CarouselPrevious className="-left-3 hidden size-11 border-2 lg:flex" />
          <CarouselNext className="-right-3 hidden size-11 border-2 lg:flex" />
        </Carousel>
      </div>
    </section>
  );
}
