import type { Metadata } from "next";
import Link from "next/link";
import { Star } from "lucide-react";

import { BookFaq, type BookFaqItem } from "@/components/book-faq";
import { BookGallery } from "@/components/book-gallery";
import { BookMobileCta } from "@/components/book-mobile-cta";
import { TemplateBookGrid } from "@/components/template-book-grid";
import { SiteFooter } from "@/components/sections/site-footer";
import {
  CATEGORY_META,
  fillerSlides,
  STORY_TEMPLATES,
  type StoryTemplate,
} from "@/data/story-templates";

const PRICE_FROM = "From";
const PRICE = "$34.99";
const STAR_COLOR = "#ffd05a";
const MUTED = "#ACACAC";
const BODY = "#60646C";
const CTA_CLASS =
  "inline-flex h-[4.5rem] items-center justify-center gap-2 rounded-full bg-primary px-12 text-xl font-bold text-white shadow-md shadow-primary/25 transition-colors hover:bg-violet-deep";

const FAQS: BookFaqItem[] = [
  {
    question: "How is the book personalized for my child?",
    answer:
      "Creating your child’s book is quick and magical: upload your child’s photo so the hero truly looks like them, enter their name and age to personalise the story throughout, then preview before ordering to make sure it’s perfect. Every page is crafted so your child feels like the true hero of the adventure.",
  },
  {
    question: "What if I need to make changes after personalizing?",
    answer:
      "After personalising, you’ll be able to review and approve your book before it’s finalised. If something isn’t quite right, you can request changes and our support team will help make it perfect.",
  },
  {
    question: "Size & Quality",
    answer:
      "Each book is a premium hardcover storybook in a large square format, with over 30 beautifully illustrated pages. Made to feel like a keepsake — sturdy, vibrant, and designed to last for years of reading.",
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
  ];
}

function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  return (
    <span
      className={`flex items-center gap-0.5 ${className}`}
      role="img"
      aria-label={`Rated ${rating} out of 5`}
    >
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          aria-hidden
          className="size-4"
          style={{
            fill: index < rating ? STAR_COLOR : "transparent",
            color: index < rating ? STAR_COLOR : MUTED,
          }}
        />
      ))}
    </span>
  );
}

function ReviewHighlight({ template }: { template: StoryTemplate }) {
  const review = template.review;
  if (!review) return null;

  return (
    <div className="rounded-lg bg-purple-50 p-6 md:p-8">
      <div className="flex items-center gap-3">
        <span className="text-base font-semibold" style={{ color: BODY }}>
          Rated {review.rating} out of 5
        </span>
        <Stars rating={review.rating} />
      </div>

      <blockquote className="mt-3 text-[17px] font-semibold leading-relaxed text-violet-deep">
        “{review.quote}”
      </blockquote>

      <p className="mt-2 text-sm" style={{ color: BODY }}>
        {review.author}
      </p>

      <a
        href="#book-reviews"
        className="mt-4 inline-block text-sm font-semibold text-primary hover:underline"
      >
        Read Reviews
      </a>
    </div>
  );
}

export function TemplateBookDetail({ template }: { template: StoryTemplate }) {
  const review = template.review;
  const ctaHref = { pathname: "/storybook/create", query: { templateId: template.slug } };
  const slides = template.media?.length ? template.media : fillerSlides();

  return (
    <div className="min-h-screen bg-paper">
      <main className="pb-20 pt-[7rem] md:pb-40">
        <div className="shell">
          <div className="flex w-full flex-col justify-between lg:flex-row lg:space-x-8">
            {/* Mobile title block */}
            <div className="order-1 py-2 text-left md:block lg:hidden">
              <h1 className="font-display text-[30px] font-semibold leading-tight text-violet-deep">
                {template.title}
              </h1>
              {review && (
                <div className="mt-2 flex items-center gap-2">
                  <Stars rating={review.rating} />
                  <span className="text-sm" style={{ color: MUTED }}>
                    ({review.count.toLocaleString("en-US")}) Reviews
                  </span>
                </div>
              )}
              <p className="mt-2 text-base" style={{ color: BODY }}>
                {template.tagline}
              </p>
            </div>

            {/* Gallery + desktop review */}
            <div className="order-2 flex flex-col md:max-w-[664px] lg:order-1 lg:max-w-[630px]">
              <BookGallery slides={slides} alt={template.title} />

              <div className="ml-24 mt-6 hidden max-w-[482px] lg:block">
                <ReviewHighlight template={template} />
              </div>
            </div>

            {/* Product info */}
            <div className="order-3 py-2 lg:order-2 lg:w-[35%] lg:py-6 lg:pl-4">
              <h1 className="hidden font-display text-[34px] font-semibold leading-[34px] text-violet-deep lg:block">
                {template.title}
              </h1>

              {review && (
                <div className="mt-3 hidden items-center gap-2 lg:flex">
                  <Stars rating={review.rating} />
                  <span className="text-sm" style={{ color: MUTED }}>
                    ({review.count.toLocaleString("en-US")}) Reviews
                  </span>
                </div>
              )}

              <p className="mt-6 text-lg leading-relaxed" style={{ color: BODY }}>
                {template.description}
              </p>

              <ul className="mt-4 list-disc space-y-1.5 pl-5 text-[16px] leading-relaxed" style={{ color: BODY }}>
                <li>For kids ages: {ageLabel(template.ageRange)} years</li>
                {highlights(template).map((highlight) => (
                  <li key={highlight}>{highlight}</li>
                ))}
              </ul>

              <div className="mt-8 flex items-center gap-2 border-t border-border pt-6 lg:hidden">
                <span className="text-base" style={{ color: MUTED }}>
                  {PRICE_FROM}
                </span>
                <span className="text-2xl font-bold text-primary">{PRICE}</span>
              </div>

              <div className="mt-6 flex flex-col-reverse gap-4 lg:flex-row lg:items-center lg:gap-6 lg:pl-4">
                <div className="hidden shrink-0 items-center gap-2 lg:flex">
                  <span className="text-base" style={{ color: MUTED }}>
                    {PRICE_FROM}
                  </span>
                  <span className="text-2xl font-bold text-primary">{PRICE}</span>
                </div>

                <Link id="book-cta" href={ctaHref} className={`${CTA_CLASS} w-full lg:w-auto`}>
                  Personalise my book
                </Link>
              </div>

              {/* Mobile review */}
              <div className="mt-8 lg:hidden">
                <ReviewHighlight template={template} />
              </div>

              {/* FAQ */}
              <div className="mt-8">
                <BookFaq items={FAQS} />
              </div>
            </div>
          </div>

          {/* Reviews */}
          <section id="book-reviews" className="mt-20 scroll-mt-32">
            <h2 className="font-display text-3xl font-bold text-violet-deep">Reviews</h2>
            {review ? (
              <div className="mt-6 max-w-[560px] rounded-3xl border border-border bg-white p-6 shadow-sm">
                <Stars rating={review.rating} />
                <blockquote className="mt-3 text-lg leading-relaxed text-foreground/85">
                  “{review.quote}”
                </blockquote>
                <p className="mt-2 text-sm font-semibold text-muted-foreground">{review.author}</p>
              </div>
            ) : (
              <p className="mt-4 text-muted-foreground">No reviews yet for this story.</p>
            )}
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

      <BookMobileCta
        href={`/storybook/create?templateId=${template.slug}`}
        targetId="book-cta"
        priceFrom={PRICE_FROM}
        price={PRICE}
      />

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
