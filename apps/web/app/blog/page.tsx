import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CalendarDays, Clock } from "lucide-react";

import { SITE_URL } from "@/lib/site";
import { blogPosts } from "@/data/blog-posts";
import { Button } from "@/components/ui/button";

const blogIndexStructuredData = {
  "@context": "https://schema.org",
  "@type": "Blog",
  name: "Mon Petit Hero Blog",
  description:
    "Guides, explainers and parenting ideas about personalized children's books.",
  url: `${SITE_URL}/blog`,
  blogPost: blogPosts.map((post) => ({
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    url: `${SITE_URL}/blog/${post.slug}`,
    datePublished: post.date,
    dateModified: post.updatedAt ?? post.date,
    author: { "@type": "Organization", name: post.author },
  })),
};

export const metadata: Metadata = {
  title: "Personalized Storybook Ideas & Guides | Mon Petit Hero Blog",
  description:
    "Guides, explainers and parenting ideas about personalized children's books — how to create a storybook with your child's face, AI storybooks explained, templates vs custom stories, and more.",
  keywords: [
    "personalized storybook",
    "personalized children's book",
    "AI storybook generator",
    "children's book with child's face",
    "custom bedtime stories",
    "Mon Petit Hero blog",
  ],
  alternates: {
    canonical: `${SITE_URL}/blog`,
  },
  openGraph: {
    title: "Personalized Storybook Ideas & Guides | Mon Petit Hero Blog",
    description:
      "Everything parents need to know about creating personalized children's books — with templates or your own story idea.",
    url: `${SITE_URL}/blog`,
    siteName: "Mon Petit Hero",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Personalized Storybook Ideas & Guides | Mon Petit Hero Blog",
    description:
      "Everything parents need to know about creating personalized children's books.",
  },
};

export default function BlogIndexPage() {
  return (
    <div className="min-h-screen bg-paper">
      <main className="pt-[7rem]">
        <div className="shell max-w-5xl pb-4 pt-14 text-center">
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-primary">
            Blog
          </span>
          <h1 className="mt-4 font-display text-4xl font-bold text-violet-deep sm:text-5xl">
            Story ideas, guides &amp; parenting tips
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-[17px] leading-relaxed text-muted-foreground">
            Learn how to turn your child into the hero of a personalized
            storybook — with ready-made templates or a story you invent
            yourself.
          </p>
        </div>

        <section className="shell max-w-5xl pb-20 pt-6">
          <div className="grid gap-6 sm:grid-cols-2">
            {blogPosts.map((post) => (
              <Link
                key={post.slug}
                href={`/blog/${post.slug}`}
                className="group flex flex-col rounded-3xl border border-border bg-white p-7 shadow-[0_2px_0_0_rgba(31,22,54,.06)] transition-all hover:-translate-y-1 hover:shadow-xl"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-4xl">{post.emoji}</span>
                  <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                    {post.category}
                  </span>
                </div>
                <h2 className="font-display text-xl leading-snug font-bold text-violet-deep group-hover:text-primary">
                  {post.title}
                </h2>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-muted-foreground">
                  {post.excerpt}
                </p>
                <div className="mt-5 flex flex-wrap items-center gap-4 border-t border-border pt-4 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {new Date(post.date).toLocaleDateString("en-US", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5" />
                    {post.readingMinutes} min read
                  </span>
                  <span className="ml-auto inline-flex items-center gap-1 font-semibold text-primary">
                    Read article
                    <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-16 rounded-[2rem] bg-violet-deep p-10 text-center text-white sm:p-12">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Ready to write your child&apos;s next adventure?
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-white/85">
              Create a personalized storybook with a template — or describe any
              story you can imagine — and get your child&apos;s face on every page.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="rounded-full bg-buttercup px-8 font-bold text-violet-deep hover:bg-buttercup/90">
                <Link href="/create-custom">Create Your Own Story</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 px-8 font-bold text-white hover:bg-white/10"
              >
                <Link href="/storybook/create">Use a Template</Link>
              </Button>
            </div>
          </div>
        </section>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(blogIndexStructuredData),
          }}
        />
      </main>
    </div>
  );
}