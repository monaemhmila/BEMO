import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CalendarDays, ChevronRight, Clock } from "lucide-react";

import {
  getBlogPost,
  blogPosts,
  type BlogPost,
  type BlogBlock,
} from "@/data/blog-posts";
import { SITE_URL } from "@/lib/site";
import { Button } from "@/components/ui/button";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return blogPosts.map((post) => ({ slug: post.slug }));
}

export function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  return params.then(({ slug }) => {
    const post = getBlogPost(slug);
    if (!post) return {};

    return {
      title: post.title,
      description: post.description,
      keywords: post.keywords,
      alternates: {
        canonical: `${SITE_URL}/blog/${post.slug}`,
      },
      openGraph: {
        title: post.title,
        description: post.description,
        url: `${SITE_URL}/blog/${post.slug}`,
        siteName: "Mon Petit Hero",
        type: "article",
        publishedTime: post.date,
        modifiedTime: post.updatedAt ?? post.date,
        authors: [post.author],
        tags: post.keywords,
      },
      twitter: {
        card: "summary_large_image",
        title: post.title,
        description: post.description,
      },
    };
  });
}

function blockStructuredData(post: BlogPost) {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.description,
    keywords: post.keywords.join(", "),
    datePublished: post.date,
    dateModified: post.updatedAt ?? post.date,
    author: {
      "@type": "Organization",
      name: post.author,
      description: post.authorRole,
    },
    publisher: {
      "@type": "Organization",
      name: "Mon Petit Hero",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${SITE_URL}/blog/${post.slug}`,
    },
    inLanguage: "en",
  };
}

function renderBlock(block: BlogBlock, index: number) {
  switch (block.type) {
    case "heading":
      return (
        <h2
          key={index}
          className="mt-9 font-display text-2xl font-bold tracking-tight text-violet-deep"
        >
          {block.text}
        </h2>
      );
    case "paragraph":
      return (
        <p
          key={index}
          className="mt-5 text-[17px] leading-[1.85] text-foreground/80"
        >
          {block.text}
        </p>
      );
    case "list":
      return (
        <ul key={index} className="mt-5 space-y-2.5">
          {block.items.map((item) => (
            <li key={item} className="flex items-start gap-3 text-[17px] leading-relaxed text-foreground/80">
              <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "quote":
      return (
        <blockquote
          key={index}
          className="mt-7 rounded-2xl border-l-4 border-primary bg-primary/5 px-6 py-5 font-display text-lg italic text-violet-deep"
        >
          {block.text}
        </blockquote>
      );
    case "cta-custom":
      return (
        <div
          key={index}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 rounded-[1.75rem] bg-violet-deep px-8 py-7 text-center"
        >
          <p className="w-full font-display text-lg font-bold text-white">
            Have a story only your family knows?
          </p>
          <Button
            asChild
            size="lg"
            className="rounded-full bg-buttercup px-8 font-bold text-violet-deep hover:bg-buttercup/90"
          >
            <Link href="/create-custom">Create Your Own Story</Link>
          </Button>
        </div>
      );
    case "cta-template":
      return (
        <div
          key={index}
          className="mt-8 flex flex-wrap items-center justify-center gap-3 rounded-[1.75rem] border-2 border-dashed border-primary/40 bg-white px-8 py-7 text-center"
        >
          <p className="w-full font-display text-lg font-bold text-violet-deep">
            Prefer a ready-made adventure?
          </p>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="rounded-full border-primary/40 px-8 font-bold text-primary hover:bg-primary/5"
          >
            <Link href="/storybook/create">Use a Template</Link>
          </Button>
        </div>
      );
  }
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = getBlogPost(slug);
  if (!post) notFound();

  const publishDate = new Date(post.date).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <div className="min-h-screen bg-paper">
      <main className="pt-[7rem]">
        <nav className="shell max-w-3xl" aria-label="Breadcrumb">
          <ol className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
            <li>
              <Link href="/" className="hover:text-primary">Home</Link>
            </li>
            <li className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href="/blog" className="hover:text-primary">Blog</Link>
            </li>
            <li className="flex items-center gap-1.5">
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="truncate text-foreground/70">{post.title}</span>
            </li>
          </ol>
        </nav>

        <article className="shell max-w-3xl pb-20">
          <header className="mt-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-primary">
              {post.emoji} {post.category}
            </span>
            <h1 className="mt-4 font-display text-3xl font-bold leading-tight text-violet-deep sm:text-5xl">
              {post.title}
            </h1>
            <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-muted-foreground">
              {post.intro}
            </p>
            <div className="mt-5 flex flex-wrap items-center justify-center gap-4 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CalendarDays className="h-4 w-4" />
                {publishDate}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {post.readingMinutes} min read
              </span>
              <span>By {post.author}</span>
            </div>
          </header>

          <div className="mt-10 rounded-[2rem] bg-white p-8 shadow-[0_2px_0_0_rgba(31,22,54,.06)] sm:p-10">
            {post.body.map((block, i) => renderBlock(block, i))}
          </div>

          <section className="mt-12 rounded-[2rem] bg-violet-deep p-10 text-center text-white sm:p-12">
            <h2 className="font-display text-2xl font-bold sm:text-3xl">
              Turn your child into the hero today
            </h2>
            <p className="mx-auto mt-3 max-w-md text-white/85">
              Your child&apos;s face on every page and their name in every
              line — your next favorite bedtime story is minutes away.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
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
          </section>

          <section className="mt-12">
            <h2 className="font-display text-xl font-bold text-violet-deep">
              Continue reading
            </h2>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {blogPosts
                .filter((p) => p.slug !== post.slug)
                .slice(0, 2)
                .map((p) => (
                  <Link
                    key={p.slug}
                    href={`/blog/${p.slug}`}
                    className="group rounded-2xl border border-border bg-white p-5 transition-all hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <span className="text-2xl">{p.emoji}</span>
                    <h3 className="mt-2 font-display font-bold text-violet-deep group-hover:text-primary">
                      {p.title}
                    </h3>
                    <p className="mt-1.5 text-sm text-muted-foreground">
                      {p.excerpt}
                    </p>
                  </Link>
                ))}
            </div>
          </section>
        </article>

        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(blockStructuredData(post)),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "BreadcrumbList",
              itemListElement: [
                { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
                { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
                {
                  "@type": "ListItem",
                  position: 3,
                  name: post.title,
                  item: `${SITE_URL}/blog/${post.slug}`,
                },
              ],
            }),
          }}
        />
      </main>
    </div>
  );
}