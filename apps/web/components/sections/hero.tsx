import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FillerVideo } from "@/components/filler";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#ffe9c7_0%,#fdf7ef_38%,#f3ecff_100%)]">
      {/* decorative top banner art — replace with <Image src="/img/top-banner.webp" /> */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_20%_0%,rgba(91,59,212,.18),transparent),radial-gradient(60%_100%_at_85%_0%,rgba(255,200,61,.35),transparent)]"
      />

      <div className="shell relative grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div className="text-center lg:text-left">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
            Create unique storybook
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] font-bold text-violet-deep sm:text-5xl lg:text-[3.6rem]">
            Craft magical tales
            <br className="hidden sm:block" /> where you&apos;re the hero
          </h1>
          <p className="mx-auto mt-5 max-w-[46ch] text-base text-muted-foreground lg:mx-0">
            Upload a photo, pick a story, and your child becomes the main
            character — printed, bound, and delivered to your door.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button
              asChild
              size="lg"
              className="h-13 w-full rounded-full px-8 text-base font-bold shadow-[0_10px_0_-2px_var(--ww-violet-dark)] transition-transform active:translate-y-0.5 sm:w-auto"
            >
              <Link href="/personalise" data-track="hero_try_for_free">Try for free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 w-full rounded-full border-2 px-8 text-base font-bold sm:w-auto"
            >
              <Link href="/books">View all books</Link>
            </Button>
          </div>
        </div>

        <div className="relative">
          <div className="aspect-[4/3] w-full overflow-hidden rounded-[2rem] border-4 border-white shadow-[0_28px_60px_-28px_rgba(31,22,54,.5)]">
            <FillerVideo label="Storybook preview" />
          </div>
          <span
            aria-hidden
            className="absolute -bottom-4 -left-4 hidden size-20 rotate-12 rounded-2xl bg-buttercup sm:block"
          />
          <span
            aria-hidden
            className="absolute -top-5 -right-3 hidden size-14 rounded-full bg-blush sm:block"
          />
        </div>
      </div>
    </section>
  );
}