"use client";

import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { BookHeart, Camera, Gift, WandSparkles } from "lucide-react";

import { Button } from "@/components/ui/button";

const promises = [
  {
    icon: Camera,
    title: "They recognise themselves",
    text: "Their photo, name and personality become part of every adventure.",
    color: "bg-[#e8f8fb] text-primary",
  },
  {
    icon: BookHeart,
    title: "You make time to connect",
    text: "A beautiful reason to put the phone down and read one more page together.",
    color: "bg-[#ffe6e1] text-[#c55252]",
  },
  {
    icon: Gift,
    title: "The magic lasts",
    text: "A printed, bound keepsake they can return to long after bedtime.",
    color: "bg-[#fff0d2] text-[#a86d00]",
  },
];

export function MagicPromise() {
  return (
    <section className="relative overflow-hidden bg-violet-deep py-16 text-white lg:py-24">
      <div className="absolute -left-24 top-10 size-64 rounded-full bg-primary/30 blur-3xl" aria-hidden />
      <div className="absolute -right-24 bottom-0 size-72 rounded-full bg-buttercup/20 blur-3xl" aria-hidden />
      <div className="shell relative">
        <div className="grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16">
          <motion.div
            initial={{ opacity: 0, x: -25 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.65 }}
          >
            <p className="text-sm font-bold uppercase tracking-[0.18em] text-buttercup">More than a book</p>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">
              Give them a world where they belong.
            </h2>
            <p className="mt-5 max-w-xl text-base leading-7 text-white/75">
              Every detail is designed to make children feel seen and help families create a memory they can hold onto.
            </p>
            <Button asChild size="lg" className="mt-7 rounded-full bg-buttercup px-8 font-bold text-violet-deep hover:bg-white hover:text-violet-deep">
              <Link href="/books">Explore the adventures <WandSparkles className="size-4" /></Link>
            </Button>
          </motion.div>

          <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
            {promises.map((promise, index) => {
              const Icon = promise.icon;
              return (
                <motion.div
                  key={promise.title}
                  initial={{ opacity: 0, y: 18 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.2 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ x: 6 }}
                  className="group flex flex-col gap-4 rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur-sm transition-colors hover:bg-white/15 sm:p-6 lg:flex-row lg:items-center"
                >
                  <span className={`grid size-14 shrink-0 place-items-center rounded-2xl ${promise.color}`}>
                    <Icon className="size-7" />
                  </span>
                  <div>
                    <h3 className="font-display text-xl font-semibold text-white">{promise.title}</h3>
                    <p className="mt-1 text-sm leading-6 text-white/70">{promise.text}</p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.7 }}
          className="relative mx-auto mt-14 hidden max-w-4xl overflow-hidden rounded-[2rem] border-4 border-white/15 shadow-2xl md:block"
        >
          <Image src="/home/hero-storybook.png" alt="A personalised storybook made for a little hero" width={1200} height={700} className="h-48 w-full object-cover opacity-80 lg:h-64" />
          <div className="absolute inset-0 bg-gradient-to-r from-violet-deep/80 via-transparent to-violet-deep/50" />
          <p className="absolute bottom-5 left-6 font-display text-xl font-semibold text-white lg:left-8 lg:text-2xl">Their imagination. Your memory. One beautiful book.</p>
        </motion.div>
      </div>
    </section>
  );
}
