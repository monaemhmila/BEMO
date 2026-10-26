import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Camera, Heart, Sparkles, Truck } from "lucide-react";

import { BookCard } from "@/components/book-card";
import { LocalizedStoryText } from "@/components/localized-story-text";
import { FillerImage } from "@/components/filler";
import { SiteFooter } from "@/components/sections/site-footer";
import { Button } from "@/components/ui/button";
import { getBook, allBooks, bestsellers, newReleases, girlsBooks, boysBooks } from "@/lib/data";
import { getStoreTemplates } from "@/lib/story-templates";
import { MotionReveal } from "@/components/motion-reveal";
import type { StoryTemplate } from "@/data/story-templates";

const KNOWN_STORE_SLUGS = new Set([
  "lets-count-1-10",
  "my-abc-adventure",
  "my-little-dragon-friend",
  "the-castle-above-the-clouds",
  "my-dinosaur-adventure",
  "the-secret-door-to-fairyland",
  "the-little-wizards-first-spell",
  "the-rainbow-that-lost-its-colors",
  "the-unicorns-missing-star",
  "the-magic-toy-shop",
  "my-magical-shapes-adventure",
  "the-wonderful-world-of-colors",
  "my-first-trip-to-space",
  "my-first-day-at-school",
]);

function fallbackTemplate(slug: string): StoryTemplate | undefined {
  if (!KNOWN_STORE_SLUGS.has(slug)) return undefined;
  return {
    slug,
    title: slug.replace(/-/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase()),
    audience: "any",
    category: "adventure",
    categoryLabel: "Adventure",
    emoji: "",
    tagline: "A personalised adventure for your child.",
    description: "Create a magical personalised storybook with your child as the hero.",
    excerpt: "",
    coverImage: `/templates/${slug}/cover.png`,
    previews: [],
    ageRange: "2-8",
    theme: "",
    artStyle: "",
  };
}

/**
 * Keep the route usable even if a client-only gallery/detail enhancement fails
 * during server rendering. The catalogue data is still shown and the CTA
 * remains available; the richer detail component can be restored independently.
 */
function StoreTemplateFallback({ template }: { template: StoryTemplate }) {
  return (
    <div className="min-h-screen bg-paper">
      <main className="pb-20 pt-[7rem]">
        <div className="shell">
          <Link href="/books" className="inline-flex pt-10 text-sm font-semibold text-muted-foreground hover:text-primary">
            <ArrowLeft className="mr-2 size-4" /> Back to all books
          </Link>
          <div className="mt-8 grid items-start gap-12 lg:grid-cols-2">
            <div className="overflow-hidden rounded-3xl bg-white shadow-xl">
              {template.coverImage ? (
                <img src={template.coverImage} alt={`${template.title} book cover`} className="aspect-square w-full object-cover" />
              ) : (
                <div className="aspect-square bg-primary/10" />
              )}
            </div>
            <div className="lg:py-6">
              <p className="text-sm font-bold uppercase tracking-[0.15em] text-primary">Personalised storybook</p>
              <h1 className="mt-4 font-display text-4xl font-bold text-violet-deep sm:text-5xl">{template.title}</h1>
              <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{template.description}</p>
              <p className="mt-4 text-muted-foreground">For kids ages {template.ageRange} years.</p>
              <Link href={`/storybook/create?templateId=${encodeURIComponent(template.slug)}`} className="mt-8 inline-flex rounded-full bg-primary px-8 py-4 font-bold text-white hover:bg-violet-deep">
                Personalise my book
              </Link>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

/**
 * The legacy hard-coded books are still pre-rendered. Story templates are read
 * from the database at request time instead, so `dynamicParams` stays on: a
 * template added to the database is reachable immediately, without a rebuild.
 */
export function generateStaticParams() {
  return allBooks.map((book) => ({ slug: book.slug }));
}

function relatedBooks(slug: string) {
  const pools = [bestsellers, newReleases, girlsBooks, boysBooks];
  const pool = pools.find((p) => p.some((b) => b.slug === slug)) ?? allBooks;
  return pool.filter((b) => b.slug !== slug).slice(0, 3);
}

const HIGHLIGHTS = [
  {
    icon: Camera,
    title: "Your child is the hero",
    text: "Their photo, name and age are woven into every scene.",
  },
  {
    icon: Heart,
    title: "Personalised to perfection",
    text: "Pick names, characters and details to make it truly theirs.",
  },
  {
    icon: Truck,
    title: "Printed with care, shipped fast",
    text: "Premium softcover books delivered right to your door.",
  },
];

export default async function BookDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const templates = await getStoreTemplates();
  const template = templates.find((item) => item.slug === slug) ?? fallbackTemplate(slug);
  if (template) {
    return <StoreTemplateFallback template={template} />;
  }

  const book = getBook(slug);
  if (!book) notFound();

  const related = relatedBooks(slug);

  return (
    <div className="min-h-screen bg-paper">
      <main className="pt-[7rem] pb-20">
        <div className="shell">
          <nav aria-label="Breadcrumb" className="pt-10">
            <Link
              href="/books"
              className="inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-4" />
              Back to all books
            </Link>
          </nav>

          <MotionReveal className="mt-8 grid items-start gap-12 lg:grid-cols-2">
            <MotionReveal amount={0.12}>
              <div className="relative">
                <div className="absolute inset-4 -rotate-3 rounded-[2.5rem] bg-buttercup/20" />
                <div className="relative aspect-square overflow-hidden rounded-[2rem] shadow-2xl shadow-primary/20 ring-1 ring-border">
                  <FillerImage label={book.title} />
                </div>
              </div>
            </MotionReveal>

            <MotionReveal amount={0.12} className="lg:py-4">
              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-primary">
                Personalised book
              </span>
              <h1 className="mt-4 font-display text-4xl font-bold text-violet-deep sm:text-5xl">
                <LocalizedStoryText
                  templateId={book.slug}
                  field="title"
                  fallback={book.title}
                />
              </h1>
              <p className="mt-3 text-lg leading-relaxed text-muted-foreground">
                <LocalizedStoryText
                  templateId={book.slug}
                  field="tagline"
                  fallback={book.tagline}
                />
              </p>

              <div className="mt-6 flex items-baseline gap-3">
                <span className="font-display text-3xl font-bold text-foreground">
                  {book.price}
                </span>
                {book.compareAt && (
                  <span className="text-lg text-muted-foreground line-through">
                    {book.compareAt}
                  </span>
                )}
              </div>
              {book.badge && (
                <span className="mt-2 inline-block rounded-full bg-destructive px-3 py-1 text-xs font-bold text-white">
                  {book.badge} off
                </span>
              )}

              <p className="mt-6 max-w-xl leading-relaxed text-foreground/80">
                This is the story where <strong>{book.title}</strong> becomes the
                adventure your child is at the center of. Upload a photo of your
                child, add their first name and age, and watch as they become
                the hero of this beautifully illustrated, printed storybook.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="rounded-full px-8 font-bold">
                  <Link href="/storybook/create">
                    <Sparkles className="size-5" />
                    Personalise this book
                  </Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="rounded-full px-8 font-semibold">
                  <Link href="/support">Talk to support</Link>
                </Button>
              </div>
            </MotionReveal>
          </MotionReveal>

          {/* Highlights */}
          <MotionReveal className="mt-20 grid gap-6 md:grid-cols-3">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }) => (
              <div
                key={title}
                className="rounded-3xl border border-border bg-white p-6 shadow-sm"
              >
                <div className="grid size-12 place-items-center rounded-2xl bg-primary/15 text-primary">
                  <Icon className="size-6" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-violet-deep">
                  {title}
                </h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                  {text}
                </p>
              </div>
            ))}
          </MotionReveal>

          {/* Related */}
          {related.length > 0 && (
            <MotionReveal className="mt-20">
              <div className="mb-8 flex items-end justify-between">
                <h2 className="font-display text-3xl font-bold text-violet-deep">
                  More stories to love
                </h2>
                <Link
                  href="/books"
                  className="hidden items-center gap-1 text-sm font-bold text-primary hover:underline sm:inline-flex"
                >
                  Browse all <ArrowRight className="size-4" />
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3">
                {related.map((b) => (
                  <BookCard key={b.slug} book={b} />
                ))}
              </div>
            </MotionReveal>
          )}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = (await getStoreTemplates()).find((item) => item.slug === slug) ?? fallbackTemplate(slug);
  if (template) {
    return {
      title: template.title,
      description: `${template.tagline} Personalise this storybook so your child becomes the hero.`,
      alternates: { canonical: `/books/${template.slug}` },
    };
  }

  const book = getBook(slug);
  if (!book) return { title: "Book not found" };
  return {
    title: book.title,
    description: `${book.tagline} Personalise this storybook so your child becomes the hero.`,
  };
}
