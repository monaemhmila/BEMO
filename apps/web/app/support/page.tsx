import type { Metadata } from "next";
import Link from "next/link";
import { FileText, HelpCircle, Mail, ShieldCheck } from "lucide-react";

import { SiteFooter } from "@/components/sections/site-footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Support",
  description:
    "Get help with your Mon Petit Hero order: contact the team, read the FAQs, or review the terms and privacy policy.",
};

const CARDS = [
  {
    icon: HelpCircle,
    title: "FAQs",
    text: "Quick answers on ordering, personalisation, shipping, refunds and more.",
    href: "/faqs",
    cta: "Read FAQs",
  },
  {
    icon: Mail,
    title: "Contact us",
    text: "Send the team a message and hear back within 24 hours.",
    href: "/contact",
    cta: "Contact the team",
  },
  {
    icon: FileText,
    title: "Terms & Conditions",
    text: "The fine print on orders, prints, payments and our promise to you.",
    href: "/support/terms-and-conditions",
    cta: "Read terms",
  },
  {
    icon: ShieldCheck,
    title: "Privacy Policy",
    text: "How we handle the photos, names and details you share with us.",
    href: "/support/privacy-policy",
    cta: "Read privacy policy",
  },
];

export default function SupportPage() {
  return (
    <div className="min-h-screen bg-paper">
      <main className="pt-[7rem] pb-20">
        <div className="shell">
          <div className="pt-14 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-primary">
              We&apos;re here to help
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold text-violet-deep sm:text-5xl">
              How can we help you?
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              Find answers to common questions, get in touch with the team, or
              catch up on the details that matter.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-6 sm:grid-cols-2">
            {CARDS.map(({ icon: Icon, title, text, href, cta }) => (
              <Link
                key={title}
                href={href}
                className="group flex flex-col rounded-3xl border border-border bg-white p-8 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-xl"
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Icon className="size-6" />
                </div>
                <h2 className="mt-4 font-display text-xl font-semibold text-violet-deep">
                  {title}
                </h2>
                <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
                <span className="mt-5 text-sm font-bold text-primary group-hover:underline">
                  {cta} →
                </span>
              </Link>
            ))}
          </div>

          <div className="mt-14 text-center">
            <p className="text-muted-foreground">
              Need a human? Email us at{" "}
              <a
                href="mailto:support@monpetithero.shop"
                className="font-bold text-primary hover:underline"
              >
                support@monpetithero.shop
              </a>
            </p>
            <Button asChild variant="outline" size="lg" className="mt-5 rounded-full px-8 font-bold">
              <Link href="/contact">Send a message</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}