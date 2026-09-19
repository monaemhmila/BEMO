import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FillerImage } from "@/components/filler";
import type { Book } from "@/lib/data";

export function BookCard({ book }: { book: Book }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-border transition-shadow hover:shadow-[0_18px_40px_-22px_rgba(31,22,54,.45)]">
      <Link
        href={`/books/${book.slug}`}
        className="relative block aspect-square overflow-hidden rounded-b-none rounded-t-3xl"
      >
        <FillerImage label={book.title} />
        {book.badge && (
          <span className="absolute left-3 top-3 rounded-full bg-destructive px-2.5 py-1 text-xs font-bold text-white">
            {book.badge}
          </span>
        )}
      </Link>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-display text-[17px] leading-snug font-semibold text-violet-deep">
          <Link href={`/books/${book.slug}`} className="hover:underline">
            {book.title}
          </Link>
        </h3>
        <p className="mt-1.5 line-clamp-2 text-sm text-muted-foreground">
          {book.tagline}
        </p>

        <div className="mt-3 flex items-baseline gap-2">
          <span className="font-display text-lg font-bold text-foreground">
            {book.price}
          </span>
          {book.compareAt && (
            <span className="text-sm text-muted-foreground line-through">
              {book.compareAt}
            </span>
          )}
        </div>

        <Button
          asChild
          className="mt-4 h-11 w-full rounded-full font-bold"
          variant="secondary"
        >
          <Link href={`/books/${book.slug}`}>Personalise now</Link>
        </Button>
      </div>
    </article>
  );
}