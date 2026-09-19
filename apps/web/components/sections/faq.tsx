import Link from "next/link";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { faqs } from "@/lib/data";

function faqAnchor(question: string, index: number) {
  return (
    question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `faq-${index}`
  );
}

export function Faq() {
  return (
    <section className="bg-paper py-16 lg:py-20">
      <div className="shell max-w-[880px]">
        <h2 className="text-center font-display text-3xl font-bold text-violet-deep sm:text-4xl">
          Frequently asked questions
        </h2>

        <Accordion
          type="single"
          collapsible
          defaultValue="item-0"
          className="mt-10 space-y-3"
        >
          {faqs.map((faq, i) => (
            <AccordionItem
              key={faq.q}
              value={`item-${i}`}
              id={faqAnchor(faq.q, i)}
              className="rounded-2xl border-0 bg-white px-5 shadow-[0_2px_0_0_rgba(31,22,54,.06)] scroll-mt-28"
            >
              <AccordionTrigger className="py-5 text-left font-display text-base font-semibold text-violet-deep">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-[15px] leading-relaxed text-muted-foreground">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        <div className="mt-8 text-center">
          <Button asChild variant="outline" className="rounded-full border-2 font-bold">
            <Link href="/faqs">See all questions</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}