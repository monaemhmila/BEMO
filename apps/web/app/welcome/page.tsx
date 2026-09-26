"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, Sparkles, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    title: "Add your child's photo",
    description: "One clear, smiling photo keeps the hero recognizable on every page.",
    icon: <Upload className="size-6" />,
  },
  {
    title: "Generate the story",
    description: "Pick a theme and we write and illustrate it in minutes.",
    icon: <Sparkles className="size-6" />,
  },
  {
    title: "Read it or order a printed book",
    description: "Every printed book you order unlocks 1 extra free story.",
    icon: <BookOpen className="size-6" />,
  },
];

export default function Welcome() {
  return (
    <div className="min-h-screen bg-paper flex items-center justify-center px-4 py-16 pt-[7rem]">
      <div className="max-w-3xl w-full bg-card border border-border rounded-3xl shadow-xl p-10 space-y-10 text-center">
        <div>
          <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-bold uppercase tracking-[0.2em] text-primary mb-4">
            Welcome
          </span>
          <h1 className="text-4xl font-display font-bold text-violet-deep mb-4">
            Let&apos;s create your first story hero
          </h1>
          <p className="text-muted-foreground">
            Follow these quick steps. You&apos;ll be reading magical bedtime stories in no time.
          </p>
        </div>

        <div className="grid gap-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4 p-4 bg-buttercup/10 border border-buttercup/30 rounded-2xl text-left"
            >
              <div className="size-12 rounded-xl bg-card flex items-center justify-center text-primary shadow-sm">
                {step.icon}
              </div>
              <div>
                <h3 className="font-display font-semibold text-violet-deep">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Button asChild className="flex-1 h-14 rounded-full font-bold text-base">
            <Link href="/storybook/create">Create My First Story</Link>
          </Button>
          <Button asChild variant="outline" className="flex-1 h-14 rounded-full font-semibold text-base">
            <Link href="/books">Browse Books</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}