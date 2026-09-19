import type { Metadata } from "next";
import Link from "next/link";

import { BookCard } from "@/components/book-card";
import { FillerImage } from "@/components/filler";
import { SiteFooter } from "@/components/sections/site-footer";
import { Button } from "@/components/ui/button";
import { bestsellers } from "@/lib/data";

export const metadata: Metadata = {
  title: "Personalised Stickers",
  description:
    "Personalised sticker packs for your little girl or boy — printed with your child's favourite characters and delivered with love.",
};

const stickerBooks = bestsellers.filter((b) => b.slug.includes("sticker"));

const STEPS = [
  {
    title: "Pick a sticker pack",
    text: "Choose the pack that matches your child's favourite characters.",
  },
  {
    title: "Personalise it",
    text: "Add your child's name or photo so every sticker feels like theirs.",
  },
  {
    title: "Stick, share, repeat",
    text: "Waterproof and durable — perfect for books, bottles and lunchboxes.",
  },
];

export default function StickersPage() {
  return (
    <div className="min-h-screen bg-paper">
      <main className="pt-[7rem] pb-20">
        <div className="shell">
          <div className="pt-14 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-primary">
              Sticker fun
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold text-violet-deep sm:text-5xl">
              Personalised sticker packs
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              Colourful, durable stickers starring your child&apos;s world — the
              perfect extra sprinkle on any WonderWraps order.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-x-6 gap-y-10 sm:grid-cols-2">
            {stickerBooks.map((book) => (
              <BookCard key={book.slug} book={book} />
            ))}
          </div>

          <section className="mt-20 grid gap-6 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <div
                key={step.title}
                className="relative rounded-3xl border border-border bg-white p-6 shadow-sm"
              >
                <span className="absolute right-5 top-5 font-display text-5xl font-bold text-foreground/10">
                  {i + 1}
                </span>
                <h2 className="font-display text-lg font-semibold text-violet-deep">
                  {step.title}
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {step.text}
                </p>
              </div>
            ))}
          </section>

          <section className="mt-14 grid items-center gap-8 rounded-[2rem] bg-gradient-to-r from-primary to-violet-deep p-8 text-white md:grid-cols-2 md:p-12">
            <div>
              <h2 className="font-display text-3xl font-bold">
                Pair your stickers with a story
              </h2>
              <p className="mt-3 text-white/85">
                Add a fully personalised storybook to your order and your child
                gets a hero, an adventure and stickers to match.
              </p>
              <Button
                asChild
                size="lg"
                className="mt-6 rounded-full bg-buttercup px-8 font-bold text-violet-deep hover:bg-buttercup/90"
              >
                <Link href="/books">Browse books</Link>
              </Button>
            </div>
            <div className="relative aspect-square overflow-hidden rounded-3xl shadow-xl">
              <FillerImage label="Sticker pack" glyph="✨" />
            </div>
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}