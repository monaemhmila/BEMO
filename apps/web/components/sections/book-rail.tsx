"use client";

import Link from "next/link";

import { BookCard } from "@/components/book-card";
import { Button } from "@/components/ui/button";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import type { Book } from "@/lib/data";
import { cn } from "@/lib/utils";

type BookRailProps = {
  eyebrow: string;
  title: string;
  books: Book[];
  viewAllHref?: string;
  className?: string;
};

export function BookRail({
  eyebrow,
  title,
  books,
  viewAllHref = "/books",
  className,
}: BookRailProps) {
  return (
    <section className={cn("py-12 lg:py-16", className)}>
      <div className="shell">
        <div className="flex flex-wrap items-end justify-between gap-4">
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
            {books.map((book, i) => (
              <CarouselItem
                key={`${book.slug}-${i}`}
                className="basis-[72%] pl-4 sm:basis-1/2 lg:basis-1/3 xl:basis-1/4"
              >
                <BookCard book={book} />
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