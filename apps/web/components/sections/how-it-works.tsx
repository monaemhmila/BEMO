import { FillerImage } from "@/components/filler";
import { steps } from "@/lib/data";

export function HowItWorks() {
  return (
    <section className="bg-paper py-16 lg:py-20">
      <div className="shell">
        <div className="text-center">
          <p className="text-sm font-bold tracking-wide text-primary">
            Create your book in minutes
          </p>
          <h2 className="mt-2 font-display text-3xl font-bold text-violet-deep sm:text-4xl">
            How WonderWraps works
          </h2>
        </div>

        {/* Four ordered steps — the numbering here is real sequence, not decoration */}
        <ol className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((step) => (
            <li key={step.n} className="relative text-center">
              <div className="mx-auto aspect-square w-full max-w-[220px] overflow-hidden rounded-[1.75rem] border-4 border-white shadow-[0_16px_34px_-22px_rgba(31,22,54,.5)]">
                <FillerImage label={step.art} glyph={String(step.n)} />
              </div>
              <span className="mx-auto mt-[-1.1rem] grid size-9 place-items-center rounded-full bg-primary font-display text-base font-bold text-primary-foreground ring-4 ring-paper">
                {step.n}
              </span>
              <h3 className="mx-auto mt-3 max-w-[22ch] font-display text-lg font-semibold text-violet-deep">
                {step.title}
              </h3>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}