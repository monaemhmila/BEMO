import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/sections/site-footer";

export const metadata: Metadata = {
  title: "Terms & Conditions",
  description:
    "The terms and conditions that apply to ordering personalised storybooks from WonderWraps.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-paper">
      <main className="pt-[7rem] pb-20">
        <div className="shell max-w-3xl">
          <Link
            href="/support"
            className="inline-flex items-center gap-1.5 pt-10 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
          >
            ← Back to support
          </Link>

          <h1 className="mt-6 font-display text-4xl font-bold text-violet-deep">
            Terms &amp; Conditions
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: January 2026</p>

          <div className="prose-custom mt-8 space-y-6 text-[15px] leading-relaxed text-foreground/80">
            <section>
              <h2 className="font-display text-2xl font-semibold text-violet-deep">
                1. The service
              </h2>
              <p className="mt-2">
                WonderWraps.com sells personalised children&apos;s storybooks.
                Every book is created individually from details you provide,
                including your child&apos;s photo, name and age.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-violet-deep">
                2. Orders &amp; payment
              </h2>
              <p className="mt-2">
                All prices are shown in the currency you select. Payment is taken
                at checkout and your book is printed after you approve the
                preview. Each printed book order unlocks one extra free story
                generation on your account.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-violet-deep">
                3. Refunds
              </h2>
              <p className="mt-2">
                You can receive a full refund if your book has not been printed
                yet, or a partial refund if it has been printed but not yet
                shipped. Once printed and shipped, we are unable to offer a
                refund. Contact us at support@wonderwraps.com to request one.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-violet-deep">
                4. Shipping &amp; duties
              </h2>
              <p className="mt-2">
                Standard shipping usually takes 10–30 business days; express
                takes 7–20 business days. Prices listed do not include taxes,
                customs duties or import fees, which are the recipient&apos;s
                responsibility.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-violet-deep">
                5. Your content
              </h2>
              <p className="mt-2">
                You retain all rights to the photos and details you provide. We
                only use them to create and print your order and never share
                them with third parties.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-violet-deep">
                6. Contact
              </h2>
              <p className="mt-2">
                Questions about these terms? Reach us at{" "}
                <a
                  href="mailto:support@wonderwraps.com"
                  className="font-bold text-primary hover:underline"
                >
                  support@wonderwraps.com
                </a>
                .
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}