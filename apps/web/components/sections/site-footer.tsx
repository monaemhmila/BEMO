"use client";

import Link from "next/link";
import { useState } from "react";
import { BookOpen, Facebook, Instagram, Music2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { footerColumns } from "@/lib/data";

const socials = [
  { label: "Facebook", href: "https://www.facebook.com/MonPetitHero", Icon: Facebook },
  { label: "Instagram", href: "https://www.instagram.com/monpetithero/", Icon: Instagram },
  { label: "TikTok", href: "https://www.tiktok.com/@monpetithero.shop", Icon: Music2 },
];

const payments = ["Visa", "Mastercard", "Amex", "PayPal", "Apple Pay"];

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <footer className="bg-violet-deep pt-16 pb-10 text-white/85">
      <div className="shell grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1.6fr]">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-white/15">
              <BookOpen className="size-5" aria-hidden />
            </span>
            <span className="font-display text-xl font-semibold text-white">
              Mon Petit Hero
            </span>
          </div>
          <p className="mt-4 max-w-[38ch] text-sm leading-relaxed">
            Create hyper-personalised storybooks that make your child the hero,
            with quick customisation and speedy delivery.
          </p>
          <div className="mt-5 flex gap-2">
            {socials.map(({ label, href, Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer noopener"
                aria-label={label}
                className="grid size-10 place-items-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
              >
                <Icon className="size-4.5" aria-hidden />
              </a>
            ))}
          </div>
        </div>

        {footerColumns.map((col) => (
          <nav key={col.heading} aria-label={col.heading}>
            <h3 className="font-display text-base font-semibold text-white">
              {col.heading}
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((link) => (
                <li key={link.label}>
                  <Link href={link.href} className="hover:text-white hover:underline">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}

        <div>
          <h3 className="font-display text-base font-semibold text-white">
            Subscribe to our newsletter
          </h3>
          <p className="mt-2 text-sm">Don&apos;t miss out on the newest books.</p>
          <div className="mt-4 flex gap-2">
            <label htmlFor="newsletter" className="sr-only">
              Email address
            </label>
            <Input
              id="newsletter"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="h-11 rounded-full border-white/20 bg-white/10 text-white placeholder:text-white/50"
            />
            <Button
              onClick={() => setSent(true)}
              className="h-11 shrink-0 rounded-full bg-buttercup px-6 font-bold text-violet-deep hover:bg-buttercup/90"
            >
              Subscribe
            </Button>
          </div>
          {sent && (
            <p className="mt-2 text-sm text-buttercup" role="status">
              Subscribed. Check your inbox for a confirmation.
            </p>
          )}
        </div>
      </div>

      <div className="shell mt-12 flex flex-col items-center gap-4 border-t border-white/15 pt-6 sm:flex-row sm:justify-between">
        <ul className="flex flex-wrap items-center gap-2">
          {payments.map((p) => (
            <li
              key={p}
              className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-white/80"
            >
              {p}
            </li>
          ))}
        </ul>
        <p className="text-sm">Mon Petit Hero © {new Date().getFullYear()} All rights reserved</p>
      </div>
    </footer>
  );
}