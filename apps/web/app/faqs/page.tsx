import type { Metadata } from "next";
import Link from "next/link";

import { Faq } from "@/components/sections/faq";
import { SiteFooter } from "@/components/sections/site-footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "FAQs",
  description:
    "Answers to the most common questions about ordering, personalising, shipping and refunds for WonderWraps storybooks.",
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
            receiving your WonderWraps books.
          </p>
        </div>

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