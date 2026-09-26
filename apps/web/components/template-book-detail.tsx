import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronDown, Sparkles, Star } from "lucide-react";

import { TemplateBookCover } from "@/components/template-book-cover";
import { TemplateBookGrid } from "@/components/template-book-grid";
import { SiteFooter } from "@/components/sections/site-footer";
import { Button } from "@/components/ui/button";
import { CATEGORY_META, STORY_TEMPLATES, type StoryTemplate } from "@/data/story-templates";

const PRICE_FROM = "From";
const PRICE = "$34.99";

const SPECS = [
  { label: "Format", value: "Premium softcover" },
  { label: "Pages", value: "32 full-colour pages" },
  { label: "Paper", value: "170 gsm silk-finished" },
  { label: "Trim size", value: "8.5 × 8.5 in (21.6 × 21.6 cm)" },
  { label: "Language", value: "English, French or Arabic" },
];

const FAQS = [
  {
    question: "How is the book personalized for my child?",
    answer:
      "Creating your child’s book is quick and magical: upload your child’s photo so the hero truly looks like them, then enter their name and age to personalise the story throughout. Preview before ordering to make sure it’s perfect — every page is crafted so your child feels like the true hero of the adventure.",
  },
  {
    question: "What if I need to make changes after personalizing?",
    answer:
      "You can re-personalise the story as many times as you like before you place the order, and our support team is happy to help afterwards. Simply open your book from My Books, update the photo or name, and preview it again.",
  },
  {
    question: "How long does delivery take?",
    answer:
      "Your story is generated in minutes, then printed and shipped. Most families receive their book within 5–7 working days, and you can follow every step from your dashboard.",
  },
];

function ageLabel(ageRange: string) {
  return ageRange.replace("-", "–");
}

function highlights(template: StoryTemplate) {
  return [
    "Preview available before ordering",
    template.moral
      ? `Supports children through ${template.moral.replace(/\.$/, "").toLowerCase()}`
      : `A ${CATEGORY_META[template.category].label.toLowerCase()} story full of courage and heart`,
    "Personalised with your child’s photo, name and age",
  ];
}

export function TemplateBookDetail({ template }: { template: StoryTemplate }) {
  const review = template.review;

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

          <div className="mt-8 grid items-start gap-12 lg:grid-cols-2">
            <div className="mx-auto w-full max-w-[520px] lg:mx-0 lg:max-w-none">
              <TemplateBookCover
                template={template}
                priority
                sizes="(max-width: 1024px) 520px, 520px"
              />

              <div className="mt-6 rounded-3xl border border-border bg-white/70 p-6">
                <p className="text-[13px] font-bold uppercase tracking-[0.2em] text-primary">
                  A page from the story
                </p>
                <p className="mt-3 font-display text-lg leading-relaxed text-violet-deep">
                  {template.excerpt}
                </p>
              </div>
            </div>

            <div className="lg:py-4">
              {review && (
                <div className="mb-6">
                  <div
                    className="flex items-center gap-1"
                    role="img"
                    aria-label={`Rated ${review.rating} out of 5`}
                  >
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Star
                        key={index}
                        aria-hidden
                        className={
                          index < review.rating
                            ? "size-4 fill-amber-400 text-amber-400"
                            : "size-4 fill-amber-400/30 text-amber-400/30"
                        }
                      />
                    ))}
                    <span className="ml-2 text-sm text-muted-foreground">
                      Rated {review.rating} out of 5
                    </span>
                  </div>

                  <blockquote className="mt-4 border-l-2 border-primary/40 pl-4">
                    <p className="text-[17px] leading-relaxed text-foreground/85">
                      “{review.quote}”
                    </p>
                    <footer className="mt-2 text-sm font-semibold text-foreground">
                      {review.author}
                    </footer>
                  </blockquote>

                  <a
                    href="#reviews"
                    className="mt-3 inline-block text-sm font-semibold text-primary hover:underline"
                  >
                    Read Reviews
                  </a>
                </div>
              )}

              <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.15em] text-primary">
                {CATEGORY_META[template.category].label} story
              </span>

              <h1 className="mt-4 font-display text-4xl font-bold text-violet-deep sm:text-5xl">
                {template.title}
              </h1>

              {review && (
                <a
                  href="#reviews"
                  className="mt-2 inline-block text-sm font-semibold text-muted-foreground hover:text-primary"
                >
                  ({review.count.toLocaleString("en-US")}) Reviews
                </a>
              )}

              <p className="mt-5 text-lg leading-relaxed text-foreground/80">
                {template.description}
              </p>

              <p className="mt-6 text-[17px] font-semibold text-foreground">
                For kids ages: {ageLabel(template.ageRange)} years
              </p>

              <ul className="mt-4 space-y-2">
                {highlights(template).map((highlight) => (
                  <li key={highlight} className="flex items-start gap-2 text-[15px] text-muted-foreground">
                    <Sparkles aria-hidden className="mt-1 size-4 shrink-0 text-primary" />
                    {highlight}
                  </li>
                ))}
              </ul>

              <div className="mt-8 flex items-baseline gap-2">
                <span className="text-[17px] font-medium text-muted-foreground">
                  {PRICE_FROM}
                </span>
                <span className="text-3xl font-bold text-primary">{PRICE}</span>
              </div>

              <Button asChild size="lg" className="mt-4 w-full rounded-full px-8 font-bold sm:w-auto">
                <Link href={{ pathname: "/storybook/create", query: { templateId: template.slug } }}>
                  <Sparkles className="size-5" />
                  Personalise my book
                </Link>
              </Button>
            </div>
          </div>

          {/* Size & Quality */}
          <section className="mt-20">
            <h2 className="font-display text-3xl font-bold text-violet-deep">
              Size &amp; Quality
            </h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {SPECS.map((spec) => (
                <div
                  key={spec.label}
                  className="rounded-3xl border border-border bg-white p-5 shadow-sm"
                >
                  <p className="text-[13px] font-bold uppercase tracking-[0.15em] text-muted-foreground">
                    {spec.label}
                  </p>
                  <p className="mt-1.5 font-display text-lg font-semibold text-violet-deep">
                    {spec.value}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQs */}
          <section id="reviews" className="mt-20">
            <h2 className="font-display text-3xl font-bold text-violet-deep">
              Questions parents ask
            </h2>
            <div className="mt-6 divide-y divide-border overflow-hidden rounded-3xl border border-border bg-white">
              {FAQS.map((faq) => (
                <details key={faq.question} className="group">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-6 font-display text-lg font-semibold text-violet-deep">
                    {faq.question}
                    <ChevronDown
                      aria-hidden
                      className="size-5 shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                    />
                  </summary>
                  <p className="px-6 pb-6 text-[15px] leading-relaxed text-muted-foreground">
                    {faq.answer}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* More stories */}
          <section className="mt-20">
            <h2 className="font-display text-3xl font-bold text-violet-deep">
              More stories to love
            </h2>
            <TemplateBookGrid
              templates={STORY_TEMPLATES.filter((item) => item.slug !== template.slug).slice(0, 3)}
            />
          </section>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}

export function TemplateBookDetailMetadata({
  template,
}: {
  template: StoryTemplate;
}): Metadata {
  return {
    title: template.title,
    description: `${template.tagline} Personalise this storybook so your child becomes the hero.`,
  };
}
