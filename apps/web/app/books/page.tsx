import type { Metadata } from "next";
import Link from "next/link";

import { BookCard } from "@/components/book-card";
import { SiteFooter } from "@/components/sections/site-footer";
import { Button } from "@/components/ui/button";
import { allBooks, booksForAge } from "@/lib/data";

export const metadata: Metadata = {
  title: "Personalised Books",
  description:
    "Browse personalised storybooks that make your child the hero. Choose from adventures, princess tales, space journeys and more.",
};

const AGE_FILTERS = ["All", "Age 2-4", "Age 4-6", "Age 6-8"] as const;

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ age?: string }>;
}) {
  const { age } = await searchParams;
  const active = AGE_FILTERS.includes(age as (typeof AGE_FILTERS)[number])
    ? (age as string)
    : "All";
  const books = active === "All" ? allBooks : booksForAge(active);
  const isFiltered = active !== "All";

  return (
    <div className="min-h-screen bg-paper">
      <main className="pt-[7rem] pb-20">
        <div className="shell">
          {/* Header */}
          <div className="pt-14 pb-8 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-primary">
              WonderWraps collection
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold text-violet-deep sm:text-5xl">
              Personalised storybooks
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
              Your child is the hero of every page. Pick a story, add their photo
              and name, and receive a beautifully printed book they&apos;ll
              treasure forever.
            </p>
          </div>

          {/* Age filter */}
          <div className="mb-10 flex flex-wrap items-center justify-center gap-2">
            {AGE_FILTERS.map((filter) => {
              const href =
                filter === "All"
                  ? "/books"
                  : `/books?age=${encodeURIComponent(filter)}`;
              const isActive = active === filter;
              return (
                <Link
                  key={filter}
                  href={href}
                  className={
                    isActive
                      ? "rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-violet-deep"
                      : "rounded-full border border-border bg-white px-5 py-2.5 text-sm font-semibold text-foreground/70 transition-colors hover:border-primary hover:text-primary"
                  }
                >
                  {filter}
                </Link>
              );
            })}
          </div>

          {isFiltered && (
            <p className="mb-8 text-center text-sm text-muted-foreground">
              Showing books for{" "}
              <span className="font-bold text-violet-deep">{active}</span>
            </p>
          )}

          {/* Grid */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
            {books.map((book) => (
              <BookCard key={book.slug} book={book} />
            ))}
          </div>

          {/* CTA band */}
          <section className="relative mt-16 overflow-hidden rounded-[2rem] bg-gradient-to-r from-primary to-violet-deep p-10 text-center text-white md:p-14">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Can&apos;t decide? Start with our bestsellers
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-white/85">
              Every book is fully personalised with your child&apos;s photo,
              name and age — and each printed book order unlocks an extra free
              story.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 rounded-full bg-buttercup px-8 font-bold text-violet-deep hover:bg-buttercup/90"
            >
              <Link href="/storybook/create">Create my child&apos;s story</Link>
            </Button>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}