import type { Metadata } from "next";
import Link from "next/link";

import { BooksSearch } from "@/components/books-search";
import { SiteFooter } from "@/components/sections/site-footer";
import { Button } from "@/components/ui/button";
import { searchableBooks } from "@/lib/data";

export const metadata: Metadata = {
  title: "Personalised Books",
  description:
    "Browse personalised storybooks that make your child the hero. Choose from adventures, princess tales, space journeys and more.",
};

export default async function BooksPage() {
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

          {/* Search & filters */}
          <BooksSearch books={searchableBooks} />

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