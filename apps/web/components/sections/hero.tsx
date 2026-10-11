"use client";

import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { BookOpen, Camera, Sparkles } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function Hero() {
  const scenes = [
    {
      id: "imagine",
      label: "Imagine",
      title: "A story made around them",
      image: "/home/hero-storybook.png",
      icon: Sparkles,
    },
    {
      id: "create",
      label: "Create",
      title: "Make it together",
      image: "/home/create-together.png",
      icon: Camera,
    },
    {
      id: "read",
      label: "Read",
      title: "A keepsake to treasure",
      image: "/home/reading-story.png",
      icon: BookOpen,
    },
  ] as const;
  const [activeScene, setActiveScene] = useState<(typeof scenes)[number]["id"]>("imagine");
  const scene = scenes.find((item) => item.id === activeScene) ?? scenes[0];
  const SceneIcon = scene.icon;

  return (
    <section className="relative overflow-hidden bg-[radial-gradient(120%_90%_at_50%_0%,#ffe9c7_0%,#fdf7ef_38%,#f3ecff_100%)]">
      {/* decorative top banner art — replace with <Image src="/img/top-banner.webp" /> */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(60%_100%_at_20%_0%,rgba(91,59,212,.18),transparent),radial-gradient(60%_100%_at_85%_0%,rgba(255,200,61,.35),transparent)]"
      />

      <div className="shell relative grid items-center gap-10 py-14 lg:grid-cols-[1.05fr_1fr] lg:py-20">
        <div className="order-2 text-center lg:order-1 lg:text-left">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">
            Create unique storybook
          </p>
          <h1 className="mt-4 font-display text-4xl leading-[1.08] font-bold text-violet-deep sm:text-5xl lg:text-[3.6rem]">
            Craft magical tales
            <br className="hidden sm:block" /> where you&apos;re the hero
          </h1>
          <p className="mx-auto mt-5 max-w-[46ch] text-base text-muted-foreground lg:mx-0">
            Upload a photo, pick a story, and your child becomes the main
            character — printed, bound, and delivered to your door.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Button
              asChild
              size="lg"
              className="h-13 w-full rounded-full px-8 text-base font-bold shadow-[0_10px_0_-2px_var(--ww-violet-dark)] transition-transform active:translate-y-0.5 sm:w-auto"
            >
              <Link href="/storybook/create" data-track="hero_try_for_free">Try for free</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-13 w-full rounded-full border-2 px-8 text-base font-bold sm:w-auto"
            >
              <Link href="/books">View all books</Link>
            </Button>
          </div>
        </div>

        <div className="relative order-1 lg:order-2">
          <div className="relative">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-[2rem] border-4 border-white bg-[#f5e9dc] shadow-[0_28px_60px_-28px_rgba(31,22,54,.5)]">
              <AnimatePresence mode="wait">
                <motion.div
                  key={scene.id}
                  initial={{ opacity: 0, scale: 1.04, x: 18 }}
                  animate={{ opacity: 1, scale: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.98, x: -18 }}
                  transition={{ duration: 0.45, ease: "easeOut" }}
                  className="absolute inset-0"
                >
                  <Image
                    src={scene.image}
                    alt={scene.title}
                    fill
                    priority={scene.id === "imagine"}
                    sizes="(max-width: 1024px) 100vw, 50vw"
                    className="object-cover"
                  />
                </motion.div>
              </AnimatePresence>
              <motion.div
                key={`${scene.id}-caption`}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute bottom-4 left-4 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-violet-deep shadow-lg backdrop-blur"
              >
                <SceneIcon className="size-4 text-primary" /> {scene.title}
              </motion.div>
            </div>

            <div className="mt-4 flex justify-center gap-2 sm:justify-end">
              {scenes.map((item) => {
                const Icon = item.icon;
                const selected = item.id === scene.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveScene(item.id)}
                    aria-pressed={selected}
                    className={`group flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-bold transition-all ${
                      selected
                        ? "border-primary bg-primary text-white shadow-md shadow-primary/25"
                        : "border-white/80 bg-white/75 text-violet-deep hover:-translate-y-0.5 hover:border-primary/40"
                    }`}
                  >
                    <Icon className="size-3.5" />
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>
          <span
            aria-hidden
            className="absolute -bottom-4 -left-4 hidden size-20 rotate-12 rounded-2xl bg-buttercup sm:block"
          />
          <span
            aria-hidden
            className="absolute -top-5 -right-3 hidden size-14 rounded-full bg-blush sm:block"
          />
        </div>
      </div>
    </section>
  );
}
