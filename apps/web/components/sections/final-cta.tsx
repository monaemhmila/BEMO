import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FillerImage } from "@/components/filler";

export function FinalCta() {
  return (
    <section className="py-16 lg:py-20">
      <div className="shell">
        <div className="grid items-center gap-10 overflow-hidden rounded-[2.25rem] bg-blush p-8 sm:p-12 lg:grid-cols-2">
          <div className="order-2 lg:order-1">
            <h2 className="font-display text-3xl leading-tight font-bold text-violet-deep sm:text-4xl">
              Bring your child&apos;s imagination to life!
            </h2>
            <p className="mt-4 max-w-[46ch] text-base text-foreground/75">
              Make them the hero of their own magical adventure with a
              hyper-personalised storybook.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-7 h-13 rounded-full px-9 text-base font-bold"
            >
              <Link href="/books">View all books</Link>
            </Button>
          </div>

          <div className="order-1 aspect-[5/4] overflow-hidden rounded-[1.75rem] border-4 border-white lg:order-2">
            <FillerImage label="Child reading book" />
          </div>
        </div>
      </div>
    </section>
  );
}