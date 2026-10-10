import Link from "next/link";
import Image from "next/image";

import { Button } from "@/components/ui/button";
import { PlayfulShapes } from "@/components/sections/playful-shapes";

export function CustomStoryBanner() {
  return (
    <section className="relative overflow-hidden py-16 lg:py-20">
      <div className="shell relative">
        <div className="relative grid items-center gap-10 overflow-hidden rounded-[2.25rem] bg-violet-deep p-8 sm:p-12 lg:grid-cols-2">
          <PlayfulShapes tone="violet" />
          <div className="animate-reveal-up relative z-10 order-2 lg:order-1">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/15 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-white">
              Your story, your rules
            </span>
            <h2 className="mt-4 font-display text-3xl leading-tight font-bold text-white sm:text-4xl">
              No template? Write your own story.
            </h2>
            <p className="mt-4 max-w-[48ch] text-base text-white/80">
              Describe any story you can imagine — a holiday memory, an imaginary friend, a lesson you want to teach — and watch it become a fully illustrated book with your child as the hero.
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="h-13 rounded-full bg-buttercup px-9 text-base font-bold text-violet-deep hover:bg-buttercup/90"
              >
                <Link href="/create-custom" data-track="custom_story_cta">Create Your Own Story</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-13 rounded-full border-white/40 px-9 text-base font-bold text-blue-600 hover:bg-white/10 hover:text-white"
              >
                <Link href="/storybook/create">Use a Template</Link>
              </Button>
            </div>
          </div>

          <div className="animate-reveal-up relative z-10 order-1 aspect-[5/4] overflow-hidden rounded-[1.75rem] border-4 border-white/20 transition-transform duration-500 hover:rotate-1 hover:scale-[1.02] lg:order-2">
            <Image
              src="/home/create-together.png"
              alt="A parent and child creating a storybook together"
              width={1024}
              height={819}
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
