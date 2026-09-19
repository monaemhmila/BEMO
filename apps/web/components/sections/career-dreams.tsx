import Link from "next/link";

import { Button } from "@/components/ui/button";
import { FillerImage } from "@/components/filler";
import { careers } from "@/lib/data";

export function CareerDreams() {
  return (
    <section className="relative overflow-hidden bg-violet-deep py-16 text-white lg:py-20">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background:radial-gradient(45%_60%_at_15%_20%,rgba(255,200,61,.35),transparent),radial-gradient(45%_60%_at_85%_80%,rgba(255,233,226,.28),transparent)]"
      />
      <div className="shell relative grid items-center gap-12 lg:grid-cols-[1fr_1.15fr]">
        <div className="text-center lg:text-left">
          <p className="text-sm font-bold tracking-wide text-buttercup">
            Personalised stories that celebrate their big dreams
          </p>
          <h2 className="mt-3 font-display text-3xl leading-tight font-bold sm:text-4xl">
            Inspire their dreams with hyper-personalised career adventures!
          </h2>
          <Button
            asChild
            size="lg"
            className="mt-7 h-13 rounded-full bg-buttercup px-9 text-base font-bold text-violet-deep hover:bg-buttercup/90"
          >
            <Link href="/books">Explore careers</Link>
          </Button>
        </div>

        <ul className="grid grid-cols-2 gap-5 sm:grid-cols-4 lg:grid-cols-2 xl:grid-cols-4">
          {careers.map((career) => (
            <li key={career.label} className="text-center">
              <div className="aspect-[3/4] overflow-hidden rounded-[1.5rem] border-4 border-white/20">
                <FillerImage label={career.art} />
              </div>
              <p className="mt-3 font-display text-base font-semibold">
                {career.label}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}