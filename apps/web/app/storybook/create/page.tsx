"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, ArrowRight, BookOpen, Sparkles, WandSparkles } from "lucide-react";

import { StoryGenerator } from "@/features/generator";
import { STORY_TEMPLATES } from "@/data/story-templates";

const LOADER = (
  <div className="flex items-center justify-center py-24">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

const COVERS = STORY_TEMPLATES.slice(0, 3);

export default function StorybookCreatePage() {
  return (
    <Suspense fallback={LOADER}>
      <CreateChooser />
    </Suspense>
  );
}

function CreateChooser() {
  const templateId = useSearchParams().get("templateId");
  const custom = useSearchParams().get("custom");

  if (templateId || custom) {
    return (
      <div>
        <motion.div
          initial={{ opacity: 0, x: -12 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6"
        >
          <Link
            href="/storybook/create"
            className="inline-flex items-center gap-2 rounded-full border border-border bg-white/80 px-4 py-2 text-sm font-semibold text-primary transition-colors hover:bg-white"
          >
            <ArrowLeft className="size-4" />
            Back to the options
          </Link>
        </motion.div>

        <Suspense fallback={LOADER}>
          <StoryGenerator />
        </Suspense>
      </div>
    );
  }

  return (
    <div className="relative overflow-hidden pb-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-buttercup/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-8 top-24 size-72 rounded-full bg-blush/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-24 size-64 rounded-full bg-buttercup/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -left-8 top-24 size-72 rounded-full bg-blush/30 blur-3xl"
      />

      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="relative text-center"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-buttercup/40 bg-buttercup/15 px-4 py-1.5 text-sm font-bold text-violet-deep">
          <Sparkles className="size-4 animate-pulse text-primary" />
          Let&apos;s make a book
        </span>

        <h1 className="mt-5 font-display text-4xl font-bold leading-tight text-violet-deep md:text-5xl">
          How would you like to start?
        </h1>

        <p className="mx-auto mt-4 max-w-xl text-lg text-muted-foreground">
          Two easy ways to begin. Pick one and we&apos;ll do the magic.
        </p>
      </motion.header>

      <div className="relative mt-12 grid gap-6 md:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
          whileHover={{ y: -6 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-[2rem] bg-gradient-to-br from-buttercup/50 to-blush/40 p-1.5 shadow-sm"
        >
          <Link href="/books" className="group flex h-full flex-col rounded-[1.75rem] bg-white p-8">
            <div className="flex h-28 items-end gap-3">
              {COVERS.map((template, index) => (
                <motion.span
                  key={template.slug}
                  animate={{ y: [0, -6, 0] }}
                  transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: index * 0.25,
                  }}
                  className="block w-16 overflow-hidden rounded-lg border border-border shadow-md"
                  style={{ rotate: `${index === 1 ? 0 : index === 0 ? -6 : 6}deg` }}
                >
                  <img
                    src={template.coverImage}
                    alt=""
                    aria-hidden
                    loading="lazy"
                    decoding="async"
                    className="aspect-[3/4] w-full object-cover"
                  />
                </motion.span>
              ))}
            </div>

            <p className="mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-primary">
              <BookOpen className="size-4" />
              Option one
            </p>

            <h2 className="mt-2 font-display text-2xl font-bold text-violet-deep">
              Browse our story books
            </h2>

            <p className="mt-2 text-muted-foreground">
              Choose a ready-made adventure from the shelf, then put your child right into it.
            </p>

            <span className="mt-6 inline-flex items-center gap-2 font-bold text-primary">
              Browse books
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1.5" />
            </span>
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.22, ease: "easeOut" }}
          whileHover={{ y: -6 }}
          whileTap={{ scale: 0.98 }}
          className="rounded-[2rem] bg-gradient-to-br from-primary/40 to-sky-300/40 p-1.5 shadow-sm"
        >
          <Link
            href="/storybook/create?custom=1"
            className="group flex h-full flex-col rounded-[1.75rem] bg-white p-8"
          >
            <span className="relative flex size-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <WandSparkles className="size-8" />
              <Sparkles
                aria-hidden
                className="absolute -right-1 -top-1 size-5 animate-ping text-buttercup"
              />
            </span>

            <p className="mt-6 flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-primary">
              <Sparkles className="size-4" />
              Option two
            </p>

            <h2 className="mt-2 font-display text-2xl font-bold text-violet-deep">
              Create your own book
            </h2>

            <p className="mt-2 text-muted-foreground">
              No templates — describe any story you can imagine and we&apos;ll draw it around your
              child.
            </p>

            <span className="mt-6 inline-flex items-center gap-2 font-bold text-primary">
              Start creating
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1.5" />
            </span>
          </Link>
        </motion.div>
      </div>
    </div>
  );
}
