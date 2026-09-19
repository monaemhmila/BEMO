import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, Lightbulb, Paperclip } from "lucide-react";

import { FillerImage } from "@/components/filler";
import { SiteFooter } from "@/components/sections/site-footer";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Tips, ideas and stories from the WonderWraps family on personalised books, bedtime reading and little heroes.",
};

const POSTS = [
  {
    icon: Compass,
    category: "Bedtime tips",
    title: "Why personalised books make bedtime easier",
    excerpt:
      "When your child is the hero, they beg for one more page. Here's the science behind personalised bedtime stories — and how to make them a habit.",
    date: "Coming soon",
  },
  {
    icon: Lightbulb,
    category: "Ideas",
    title: "10 adventures to spark your child's imagination",
    excerpt:
      "From dragon rescues to cosmic journeys, these story ideas are a great starting point for your child's very own book.",
    date: "Coming soon",
  },
  {
    icon: Paperclip,
    category: "News",
    title: "Personalisation: how your child's book is made",
    excerpt:
      "A peek behind the scenes at how we turn a photo, a name and a story idea into a beautifully printed keepsake.",
    date: "Coming soon",
  },
];

export default function BlogPage() {
  return (
    <div className="min-h-screen bg-paper">
      <main className="pt-[7rem] pb-20">
        <div className="shell">
          <div className="pt-14 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-primary">
              The WonderWraps blog
            </span>
            <h1 className="mt-4 font-display text-4xl font-bold text-violet-deep sm:text-5xl">
              Stories behind the stories
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-[17px] leading-relaxed text-muted-foreground">
              Ideas, tips and behind-the-scenes peeks to help you raise
              little readers and big dreamers.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            {POSTS.map((post) => {
              const Icon = post.icon;
              return (
                <article
                  key={post.title}
                  className="flex flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-sm"
                >
                  <div className="aspect-video w-full">
                    <FillerImage label={post.title} rounded={false} />
                  </div>
                  <div className="flex flex-1 flex-col p-6">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary">
                        <Icon className="size-3.5" />
                        {post.category}
                      </span>
                      <span className="text-xs text-muted-foreground">{post.date}</span>
                    </div>
                    <h2 className="mt-3 font-display text-lg font-semibold text-violet-deep">
                      {post.title}
                    </h2>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">
                      {post.excerpt}
                    </p>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary">
                      Read more <ArrowRight className="size-3.5" />
                    </span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="mt-14 text-center">
            <p className="mx-auto max-w-md text-muted-foreground">
              Meanwhile, why not start your child&apos;s own story?
            </p>
            <Button asChild size="lg" className="mt-5 rounded-full px-8 font-bold">
              <Link href="/storybook/create">Create a personalised book</Link>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}