import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FillerImage } from "@/components/filler";

export function CustomStoryBanner() {
  return (
    <section className="py-16 lg:py-20">
      <div className="shell">
        <div className="grid items-center gap-10 overflow-hidden rounded-[2.25rem] bg-violet-deep p-8 sm:p-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-white">
              Your story, your rules
            </span>
            <h2 className="mt-4 font-display text-3xl leading-tight font-bold text-white sm:text-4xl">
              No template? Write your own story.
            </h2>
            <p className="mt-4 max-w-[48ch] text-base text-white/80">
              Describe any story you can imagine — a holiday memory, an imaginary
              friend, a lesson you want to teach — and watch it become a fully
              illustrated book with your child as the hero.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="h-13 rounded-full bg-buttercup px-9 text-base font-bold text-violet-deep hover:bg-buttercup/90"
              >
                <Link href="/create-custom">Create Your Own Story</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 rounded-full border-white/40 px-9 text-base font-bold text-white hover:bg-white/10"
              >
                <Link href="/storybook/create">Use a Template</Link>
              </Button>
            </div>
          </div>

          <div className="order-1 aspect-[5/4] overflow-hidden rounded-[1.75rem] border-4 border-white/20 lg:order-2">
            <FillerImage label="Child writer with storybook" />
          </div>
        </div>
      </div>
    </section>
  );
}