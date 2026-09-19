"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Mail, MessageCircle, Send, Clock } from "lucide-react";

import { SiteFooter } from "@/components/sections/site-footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitted(true);
  }

  return (
    <div className="min-h-screen bg-paper">
      <main className="pt-[7rem] pb-20">
        <div className="shell">
          <div className="pt-14 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-primary">
              We&apos;d love to hear from you
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold text-violet-deep sm:text-5xl">
              Contact us
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              Questions about an order, a personalisation, or the perfect book
              for your child? Send us a message.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-8 lg:grid-cols-[1fr_1.4fr]">
            {/* Contact info */}
            <div className="space-y-4">
              <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                    <Mail className="size-5" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-violet-deep">Email us</p>
                    <a
                      href="mailto:support@wonderwraps.com"
                      className="text-sm text-primary hover:underline"
                    >
                      support@wonderwraps.com
                    </a>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl bg-buttercup/25 text-violet-deep">
                    <MessageCircle className="size-5" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-violet-deep">Chat with us</p>
                    <p className="text-sm text-muted-foreground">
                      On Facebook, Instagram and TikTok
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-3xl border border-border bg-white p-6 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="grid size-11 place-items-center rounded-2xl bg-primary/15 text-primary">
                    <Clock className="size-5" />
                  </div>
                  <div>
                    <p className="font-display font-semibold text-violet-deep">Response time</p>
                    <p className="text-sm text-muted-foreground">
                      We usually reply within 24 hours.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form */}
            <div className="rounded-3xl border border-border bg-white p-6 shadow-sm md:p-8">
              {submitted ? (
                <div className="flex h-full flex-col items-center justify-center py-16 text-center">
                  <div className="grid size-16 place-items-center rounded-full bg-primary/10 text-primary">
                    <Send className="size-7" />
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-bold text-violet-deep">
                    Message sent!
                  </h2>
                  <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                    Thanks for reaching out. Our team will get back to you within
                    24 hours.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5" aria-label="Contact form">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" name="name" required placeholder="Your name" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        required
                        placeholder="you@example.com"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      name="subject"
                      required
                      placeholder="What is this about?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea
                      id="message"
                      name="message"
                      required
                      rows={6}
                      placeholder="Tell us how we can help…"
                    />
                  </div>
                  <Button type="submit" className="w-full rounded-full font-bold sm:w-auto sm:px-8">
                    <Send className="size-4" />
                    Send message
                  </Button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}