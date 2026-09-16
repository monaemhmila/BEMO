"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Sparkles } from "lucide-react";
import { STORY_TEMPLATES, CATEGORY_META, type StoryCategory } from "../../data/story-templates";

const CATEGORIES: StoryCategory[] = ["adventure", "sentimental", "educative"];

export function StoryGallery() {
  return (
    <section id="stories" className="relative py-24 px-4 bg-[#faf9f6] overflow-hidden">
      {/* Decorative background */}
      <div className="absolute -top-24 right-0 w-96 h-96 bg-amber-100/40 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-emerald-100/40 rounded-full blur-[100px] pointer-events-none" />

      <div className="max-w-7xl mx-auto relative">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-amber-100 text-amber-700 text-sm font-medium mb-6 shadow-sm">
              <Sparkles className="w-3.5 h-3.5" />
              Story Gallery
            </div>
            <h2 className="text-4xl md:text-5xl font-serif font-bold text-stone-900 mb-4">
              Pick a Story, Make It <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-500 to-orange-600">Truly Yours</span>
            </h2>
            <p className="text-lg text-stone-500 leading-relaxed">
              Nine magical storybooks, ready and waiting. Tap one to open it — then bring it to life with your
              child&apos;s face, name, and details.
            </p>
          </motion.div>
        </div>

        {/* Category sections */}
        <div className="space-y-20">
          {CATEGORIES.map((category, categoryIndex) => {
            const meta = CATEGORY_META[category];
            const stories = STORY_TEMPLATES.filter((s) => s.category === category);

            return (
              <div key={category}>
                {/* Category header */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.5, delay: categoryIndex * 0.1 }}
                  className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8"
                >
                  <div>
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${meta.chip}`}>
                        {meta.label}
                      </span>
                      <span className="text-stone-400 text-sm">
                        {stories.length} stories
                      </span>
                    </div>
                    <h3 className="text-3xl font-serif font-bold text-stone-900">
                      {meta.description}
                    </h3>
                  </div>
                </motion.div>

                {/* Story cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stories.map((story, index) => (
                    <motion.div
                      key={story.slug}
                      initial={{ opacity: 0, y: 24 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: index * 0.08 }}
                    >
                      <Link
                        href={`/stories/templates/${story.slug}`}
                        className="group block rounded-3xl overflow-hidden bg-white border border-stone-100 shadow-sm hover:shadow-2xl hover:shadow-stone-900/10 transition-all duration-300 hover:-translate-y-1"
                      >
                        {/* Cover image */}
                        <div className="relative aspect-[16/10] overflow-hidden">
                          <Image
                            src={story.coverImage}
                            alt={story.title}
                            fill
                            sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                            loading="lazy"
                            className="object-cover group-hover:scale-105 transition-transform duration-700"
                          />
                          <div className={`absolute inset-0 bg-gradient-to-t ${meta.accent} opacity-0 group-hover:opacity-40 transition-opacity duration-500`} />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent" />

                          {/* Emoji badge */}
                          <div className="absolute top-4 left-4 w-11 h-11 rounded-2xl bg-white/90 backdrop-blur-sm flex items-center justify-center text-2xl shadow-lg">
                            {story.emoji}
                          </div>

                          {/* Category chip */}
                          <span className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-semibold ${meta.chip}`}>
                            {meta.label}
                          </span>

                          {/* Title on image */}
                          <div className="absolute bottom-4 left-4 right-4">
                            <h4 className="font-serif text-2xl font-bold text-white drop-shadow-lg leading-tight">
                              {story.title}
                            </h4>
                          </div>
                        </div>

                        {/* Body */}
                        <div className="p-5">
                          <p className="text-sm text-stone-500 leading-relaxed line-clamp-2">
                            {story.tagline}
                          </p>
                          <div className="mt-4 flex items-center justify-between">
                            <span className="text-xs font-medium text-stone-400">
                              Ages {story.ageRange}
                            </span>
                            <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-amber-600 group-hover:gap-2.5 transition-all">
                              Open story
                              <ArrowRight className="w-4 h-4" />
                            </span>
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mt-20 text-center"
        >
          <Link
            href="/storybook/create"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-full bg-stone-900 text-white font-semibold shadow-xl shadow-stone-900/10 hover:bg-stone-800 hover:-translate-y-0.5 transition-all"
          >
            <BookOpen className="w-5 h-5" />
            Create a Story From Scratch
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

export default StoryGallery;