"use client";

import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, BedDouble, Cake, Heart, Sparkles, Star } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { PlayfulShapes } from "@/components/sections/playful-shapes";

const moments = [
  {
    id: "bedtime",
    label: "Bedtime magic",
    title: "One more story becomes their favourite story",
    description: "Create a gentle adventure with your child at the centre — perfect for the last cuddle of the day.",
    image: "/home/reading-story.png",
    icon: BedDouble,
    color: "bg-[#e8f8fb] text-primary",
  },
  {
    id: "milestone",
    label: "A big moment",
    title: "Celebrate who they are becoming",
    description: "Mark a birthday, a brave first day, or a new dream with a keepsake made just for them.",
    image: "/home/create-together.png",
    icon: Cake,
    color: "bg-[#fff0d2] text-[#a86d00]",
  },
  {
    id: "imagination",
    label: "Their imagination",
    title: "Let their wildest ideas take the lead",
    description: "From enchanted gardens to distant planets, their imagination becomes a world they can hold.",
    image: "/before-after/princess-girl.png",
    icon: Sparkles,
    color: "bg-[#ffe6e1] text-[#c55252]",
  },
] as const;

export function FamilyMoments() {
  const [activeId, setActiveId] = useState<(typeof moments)[number]["id"]>("bedtime");
  const active = moments.find((moment) => moment.id === activeId) ?? moments[0];
  const ActiveIcon = active.icon;

  return (
    <section className="relative overflow-hidden bg-[#fffaf4] py-16 lg:py-24">
      <PlayfulShapes tone="paper" />
      <div className="shell relative">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.3 }}
            transition={{ duration: 0.55 }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-coral">Made for real family moments</p>
            <h2 className="mt-3 font-display text-3xl font-bold text-violet-deep sm:text-4xl lg:text-5xl">
              The story they will ask for again and again
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">
              A screen-free gift for parents and a whole new world for little heroes.
            </p>
          </motion.div>
        </div>

        <div className="mt-10 grid items-center gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:gap-14">
          <div className="space-y-3">
            {moments.map((moment, index) => {
              const Icon = moment.icon;
              const selected = moment.id === active.id;
              return (
                <motion.button
                  key={moment.id}
                  type="button"
                  onClick={() => setActiveId(moment.id)}
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.98 }}
                  className={`flex w-full items-center gap-4 rounded-2xl border p-4 text-left transition-all ${
                    selected
                      ? "border-primary/30 bg-white shadow-lg shadow-violet-900/10"
                      : "border-transparent hover:border-primary/15 hover:bg-white/70"
                  }`}
                  aria-pressed={selected}
                >
                  <span className={`grid size-12 shrink-0 place-items-center rounded-2xl ${moment.color}`}>
                    <Icon className="size-6" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-bold uppercase tracking-[0.12em] text-primary">0{index + 1}</span>
                    <span className="mt-1 block font-display text-lg font-semibold text-violet-deep">{moment.label}</span>
                  </span>
                  <ArrowRight className={`size-5 transition-transform ${selected ? "translate-x-1 text-primary" : "text-muted-foreground"}`} />
                </motion.button>
              );
            })}
            <div className="mt-6 flex items-center gap-2 px-2 text-sm font-semibold text-violet-deep/70">
              <Heart className="size-4 fill-buttercup text-buttercup" /> Made to be read together
            </div>
          </div>

          <div className="relative min-h-[390px] overflow-hidden rounded-[2.25rem] border-4 border-white bg-white shadow-[0_28px_70px_-30px_rgba(61,38,153,.45)] sm:min-h-[470px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={active.id}
                initial={{ opacity: 0, scale: 1.06, rotate: 1.5 }}
                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                exit={{ opacity: 0, scale: 0.98, rotate: -1.5 }}
                transition={{ duration: 0.5, ease: "easeOut" }}
                className="absolute inset-0"
              >
                <Image src={active.image} alt={active.title} fill sizes="(max-width: 1024px) 100vw, 65vw" className="object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-violet-deep/85 via-violet-deep/10 to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-6 text-white sm:p-9">
                  <div className="mb-3 flex items-center gap-2 text-sm font-bold text-buttercup"><ActiveIcon className="size-5" /> {active.label}</div>
                  <h3 className="max-w-xl font-display text-2xl font-bold sm:text-4xl">{active.title}</h3>
                  <p className="mt-3 max-w-xl text-sm leading-6 text-white/85 sm:text-base">{active.description}</p>
                </div>
              </motion.div>
            </AnimatePresence>
            <motion.span
              aria-hidden
              className="absolute right-5 top-5 grid size-12 place-items-center rounded-full bg-white/85 text-buttercup shadow-lg backdrop-blur"
              animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.08, 1] }}
              transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Star className="size-6 fill-current" />
            </motion.span>
          </div>
        </div>

        <div className="mt-10 text-center">
          <Button asChild size="lg" className="rounded-full px-8 font-bold shadow-lg shadow-primary/20">
            <Link href="/storybook/create">Make their story <ArrowRight className="size-4" /></Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
