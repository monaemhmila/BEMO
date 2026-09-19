import Link from "next/link";

import { FillerImage } from "@/components/filler";
import { ageGroups } from "@/lib/data";

export function BrowseByAge() {
  return (
    <section className="py-16 lg:py-20">
      <div className="shell">
        <h2 className="text-center font-display text-3xl font-bold text-violet-deep sm:text-4xl">
          Browse stories by age
        </h2>

        <div className="mt-10 grid gap-6 sm:grid-cols-3">
          {ageGroups.map((group) => (
            <Link
              key={group.range}
              href={`/books?age=${encodeURIComponent(group.range)}`}
              className="group relative block overflow-hidden rounded-[1.75rem] ring-1 ring-border transition-shadow hover:shadow-[0_20px_44px_-24px_rgba(31,22,54,.5)]"
            >
              <div className="aspect-[4/5]">
                <FillerImage label={group.art} />
              </div>
              <div className="absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgba(31,22,54,.8),transparent)] p-5 text-white">
                <p className="font-display text-2xl font-bold">{group.range}</p>
                <p className="mt-1 text-sm font-semibold text-white/85 underline-offset-4 group-hover:underline">
                  Discover
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}