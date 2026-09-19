import type { Metadata } from "next";
import Link from "next/link";

import { SiteFooter } from "@/components/sections/site-footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Mon Petit Hero collects, uses and protects the personal details and photos you share with us.",
};

export default function PrivacyPage() {
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
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">Last updated: January 2026</p>

          <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-foreground/80">
            <section>
              <h2 className="font-display text-2xl font-semibold text-violet-deep">
                1. What we collect
              </h2>
              <p className="mt-2">
                To create your personalised books we collect your contact details
                (name, email, shipping address) and the personalised content you
                provide, such as your child&apos;s photo, name and age.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-violet-deep">
                2. How we use it
              </h2>
              <p className="mt-2">
                We use this information to build and print your order, keep you
                updated on its progress, and improve our service. We never sell
                your personal data to anyone.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-violet-deep">
                3. Photos &amp; children&apos;s information
              </h2>
              <p className="mt-2">
                The photos and details you upload are used only to generate your
                book. They are processed securely and are never published,
                shared or used for any other purpose without your consent.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-violet-deep">
                4. Payments
              </h2>
              <p className="mt-2">
                Card payments are processed by trusted third-party payment
                providers. We do not store your full card details on our
                servers.
              </p>
            </section>

            <section>
              <h2 className="font-display text-2xl font-semibold text-violet-deep">
                5. Your rights
              </h2>
              <p className="mt-2">
                You may request a copy, correction or deletion of your personal
                data at any time by emailing support@monpetithero.shop.
              </p>
            </section>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}