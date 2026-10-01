import { steps } from "@/lib/data";
import { BookOpen, ImagePlus, PackageCheck, Sparkles } from "lucide-react";
import { PlayfulShapes } from "@/components/sections/playful-shapes";

const stepIcons = [
  <BookOpen key="book" className="size-12" strokeWidth={1.7} aria-hidden />,
  <ImagePlus key="image" className="size-12" strokeWidth={1.7} aria-hidden />,
  <Sparkles key="sparkles" className="size-12" strokeWidth={1.7} aria-hidden />,
  <PackageCheck key="package" className="size-12" strokeWidth={1.7} aria-hidden />,
];
const stepColors = ["bg-[#eee9ff] text-violet-ink", "bg-[#fff0d2] text-[#b87900]", "bg-[#ffe6e1] text-[#d05a58]", "bg-[#e4f6eb] text-[#38815a]"];

export function HowItWorks() {
  return (
    <section className="relative overflow-hidden bg-paper py-16 lg:py-20">
      <PlayfulShapes tone="paper" />
      <div className="shell relative">
        <div className="animate-reveal-up text-center">
          <p className="text-sm font-bold tracking-wide text-primary">
            Create your book in minutes
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-violet-deep sm:text-4xl">
            How Mon Petit Hero works
          </h2>
        </div>

        {/* Four ordered steps — the numbering here is real sequence, not decoration */}
        <ol className="relative mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <span aria-hidden className="absolute left-[13%] right-[13%] top-[106px] hidden border-t-2 border-dashed border-violet-ink/20 lg:block" />
          {steps.map((step, index) => {
            return (
            <li key={step.n} className="group relative text-center">
              <div className={`mx-auto grid aspect-square w-full max-w-[220px] place-items-center rounded-[1.75rem] border-4 border-white shadow-[0_16px_34px_-22px_rgba(31,22,54,.5)] transition-transform duration-300 group-hover:-translate-y-2 group-hover:rotate-1 ${stepColors[index]}`}>
                <div className="grid size-24 place-items-center rounded-[2rem] bg-white/80 shadow-sm">
                  {stepIcons[index]}
                </div>
              </div>
              <span className="mx-auto mt-[-1.1rem] grid size-9 place-items-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground ring-4 ring-paper">
                {step.n}
              </span>
              <h3 className="mx-auto mt-3 max-w-[22ch] font-display text-lg font-semibold text-violet-deep">
                {step.title}
              </h3>
            </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
