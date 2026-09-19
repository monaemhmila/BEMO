import Link from "next/link";
import Image from "next/image";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  ChevronLeft,
  Sparkles,
  Baby,
  Palette,
  BookOpenCheck,
  Heart,
  GraduationCap,
  Wand2,
  Camera,
  BedDouble,
  ArrowRight,
} from "lucide-react";
import { getStoryTemplate, STORY_TEMPLATES, CATEGORY_META, type StoryTemplate } from "../../../../data/story-templates";

export function generateStaticParams() {
  return STORY_TEMPLATES.map((story) => ({ slug: story.slug }));
}

export const dynamicParams = false;

const HOW_IT_WORKS = [
  {
    icon: Camera,
    title: "Upload your child's photo",
    text: "One clear, smiling face is all we need to keep the hero recognizable on every page.",
  },
  {
    icon: Wand2,
    title: "We write & illustrate it",
    text: "AI weaves the story around your child's face, name, age, and this exact adventure.",
  },
  {
    icon: BedDouble,
    title: "Read it together tonight",
    text: "Flip through illustrated pages, listen to the narration, or order a printed book.",
  },
];

function StoryDetailContent({ story }: { story: StoryTemplate }) {
  const meta = CATEGORY_META[story.category];
  const related = STORY_TEMPLATES.filter(
    (s) => s.category === story.category && s.slug !== story.slug
  ).slice(0, 2);

  return (
    <div className="min-h-screen bg-paper">
      {/* Top bar */}
      <header className="border-b border-border bg-white/80 backdrop-blur-md sticky top-[108px] z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link
            href="/storybook/templates"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-violet-deep transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            All Stories
          </Link>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${meta.chip}`}>
              {meta.label}
            </span>
            <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Baby className="w-3.5 h-3.5" />
              Ages {story.ageRange}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-12">
        {/* Hero */}
        <div className="grid lg:grid-cols-2 gap-10 items-center mb-16">
          {/* Cover image */}
          <div className="relative">
            <div className="absolute inset-4 bg-gradient-to-br from-buttercup/20 to-blush/40 rounded-[2.5rem] -rotate-3" />
            <div className="relative rounded-[2rem] overflow-hidden shadow-2xl shadow-primary/20 border border-white aspect-[4/3]">
              <Image
                src={story.coverImage}
                alt={story.title}
                fill
                sizes="(min-width: 1024px) 50vw, 100vw"
                priority
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
              <div className="absolute top-4 left-4 w-12 h-12 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-3xl shadow-lg">
                {story.emoji}
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-widest text-buttercup mb-1">
                    {meta.label} story
                  </p>
                  <h1 className="font-display text-3xl md:text-4xl font-bold text-white drop-shadow-lg leading-tight">
                    {story.title}
                  </h1>
                </div>
              </div>
            </div>
          </div>

          {/* Details */}
          <div>
            <p className="text-primary font-semibold text-sm uppercase tracking-widest mb-3">
              {story.tagline}
            </p>
            <p className="text-muted-foreground text-lg leading-relaxed mb-8">
              {story.description}
            </p>

            {/* Meta chips */}
            <div className="flex flex-wrap gap-3 mb-8 text-sm">
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border text-foreground/80 shadow-sm">
                <Palette className="w-4 h-4 text-primary" />
                {story.artStyle}
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border text-foreground/80 shadow-sm">
                <Baby className="w-4 h-4 text-rose-500" />
                Ages {story.ageRange}
              </span>
              <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white border border-border text-foreground/80 shadow-sm">
                <BookOpenCheck className="w-4 h-4 text-emerald-500" />
                Illustrated · Narrated
              </span>
            </div>

            {/* Moral / learning */}
            {story.moral && (
              <div className="flex items-start gap-3 bg-rose-50 border border-rose-100 rounded-2xl p-4 mb-4">
                <Heart className="w-5 h-5 text-rose-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-rose-800">
                  <strong className="font-semibold">The heart of the story:</strong> {story.moral}
                </p>
              </div>
            )}
            {story.learning && (
              <div className="flex items-start gap-3 bg-emerald-50 border border-emerald-100 rounded-2xl p-4 mb-8">
                <GraduationCap className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-emerald-800">
                  <strong className="font-semibold">What it teaches:</strong> {story.learning}
                </p>
              </div>
            )}

            {/* CTA */}
            <Link
              href={`/storybook/create?templateId=${story.slug}`}
              className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-gradient-to-r from-primary to-violet-deep text-white font-semibold shadow-xl shadow-primary/20 hover:shadow-2xl hover:shadow-primary/30 hover:-translate-y-0.5 transition-all"
            >
              <Sparkles className="w-5 h-5" />
              Create This Story with My Child
            </Link>
            <p className="text-xs text-muted-foreground mt-3">
              Uses your child&apos;s photo, name & age — every account gets 3 free story generations, and each printed book order earns one more.
            </p>
          </div>
        </div>

        {/* Peek inside */}
        <div className="rounded-[2rem] bg-white border border-border shadow-sm p-6 md:p-10 mb-16">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-2xl">📖</span>
            <h2 className="text-2xl font-display font-bold text-violet-deep">A Peek Inside</h2>
          </div>
          <div className="relative rounded-2xl bg-paper border border-border p-6 md:p-10">
            <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-muted to-transparent rounded-l-2xl" />
            <p className="font-display text-lg md:text-xl leading-relaxed text-foreground/80">
              “{story.excerpt}”
            </p>
            <div className="mt-6 flex items-center gap-3">
              <span className="w-10 h-10 rounded-full bg-buttercup/20 text-violet-deep flex items-center justify-center text-sm font-bold">AI</span>
              <div>
                <p className="text-sm font-medium text-foreground">Reimagined with your child as the hero</p>
                <p className="text-xs text-muted-foreground">Every scene features their face, name, and little details you choose.</p>
              </div>
            </div>
          </div>
        </div>

        {/* How it becomes their story */}
        <div className="mb-16">
          <h2 className="text-3xl font-display font-bold text-violet-deep mb-8 text-center">
            How It Becomes Your Child&apos;s Story
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {HOW_IT_WORKS.map((step, index) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="relative rounded-3xl bg-white border border-border shadow-sm p-8"
                >
                  <span className="absolute top-6 right-6 text-5xl font-display font-bold text-foreground/10">
                    {index + 1}
                  </span>
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-buttercup/20 to-blush/40 flex items-center justify-center mb-5">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-semibold text-lg text-violet-deep mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.text}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Related */}
        {related.length > 0 && (
          <div>
            <h2 className="text-3xl font-display font-bold text-violet-deep mb-8">
              More {meta.label} Stories
            </h2>
            <div className="grid sm:grid-cols-2 gap-6">
              {related.map((story) => (
                <Link
                  key={story.slug}
                  href={`/stories/templates/${story.slug}`}
                  className="group flex gap-4 items-center rounded-3xl bg-white border border-border shadow-sm hover:shadow-xl hover:-translate-y-0.5 transition-all overflow-hidden"
                >
                  <div className="relative w-32 h-28 overflow-hidden flex-shrink-0">
                    <Image
                      src={story.coverImage}
                      alt={story.title}
                      fill
                      sizes="128px"
                      loading="lazy"
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="pr-5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xl">{story.emoji}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${meta.chip}`}>
                        {meta.label}
                      </span>
                    </div>
                    <h3 className="font-display text-lg font-bold text-violet-deep leading-tight mb-1">
                      {story.title}
                    </h3>
                    <p className="text-xs text-muted-foreground line-clamp-1">{story.tagline}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary mt-2">
                      Open <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default async function StoryTemplateDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const story = getStoryTemplate(slug);
  if (!story) notFound();

  return <StoryDetailContent story={story} />;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const story = getStoryTemplate(slug);
  if (!story) return { title: "Story Not Found" };

  return {
    title: `${story.title} - Personalize It`,
    description: story.description,
  };
}