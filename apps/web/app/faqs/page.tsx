import type { Metadata } from "next";
import Link from "next/link";

import { Faq } from "@/components/sections/faq";
import { SiteFooter } from "@/components/sections/site-footer";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { faqs } from "@/lib/data";

function faqAnchor(question: string, index: number) {
  return (
    question
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || `faq-${index}`
  );
}

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Answers to the most common questions about ordering, personalising, shipping and refunds for Mon Petit Hero storybooks.",
};

export default function FaqsPage() {
  return (
    <div className="min-h-screen bg-paper">
      <main className="pt-[7rem]">
        <div className="shell max-w-[880px] pb-4 pt-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-primary">
            Need help?
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold text-violet-deep sm:text-5xl">
            Frequently asked questions
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
            Everything you need to know about personalising, ordering and
            receiving your Mon Petit Hero books.
          </p>
        </div>

        <section className="shell max-w-[880px] pb-4">
          <Card className="p-6">
            <h2 className="font-display text-lg font-bold text-violet-deep">
              Topics in this page
            </h2>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {faqs.map((faq, i) => (
                <li key={faq.q}>
                  <a
                    href={`#${faqAnchor(faq.q, i)}`}
                    className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-primary" />
                    {faq.q}
                  </a>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <Faq />

        <section className="bg-violet-deep py-16 text-center text-white">
          <div className="shell">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Still have a question?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">
              Our support team is happy to help — reach out any time.
            </p>
            <Button
              asChild
              size="lg"
              className="mt-6 rounded-full bg-buttercup px-8 font-bold text-violet-deep hover:bg-buttercup/90"
            >
              <Link href="/contact">Contact us</Link>
            </Button>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}