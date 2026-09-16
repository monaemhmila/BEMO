"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Upload, Sparkles, BookOpen } from "lucide-react";

const STEPS = [
  {
    title: "Upload 5-10 clear photos",
    description: "Different angles, good lighting, no sunglasses.",
    icon: <Upload className="w-6 h-6" />,
  },
  {
    title: "Train a private model",
    description: "We fine-tune a model on your child in ~20 minutes.",
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    title: "Generate unlimited stories",
    description: "Pick a theme and watch your child become the hero.",
    icon: <BookOpen className="w-6 h-6" />,
  },
];

export default function Welcome() {
  return (
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center px-4 py-16">
      <div className="max-w-3xl w-full bg-white border border-stone-100 rounded-3xl shadow-xl p-10 space-y-10 text-center">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-amber-500 mb-2">
            Welcome
          </p>
          <h1 className="text-4xl font-serif font-bold text-stone-900 mb-4">
            Let&apos;s set up your first story hero
          </h1>
          <p className="text-stone-500">
            Follow these quick steps. You&apos;ll be writing magical bedtime stories in no time.
          </p>
        </div>

        <div className="grid gap-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-4 p-4 bg-amber-50/60 border border-amber-100 rounded-2xl text-left"
            >
              <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center text-amber-600 shadow-sm">
                {step.icon}
              </div>
              <div>
                <h3 className="font-serif font-semibold text-stone-900">{step.title}</h3>
                <p className="text-stone-500 text-sm">{step.description}</p>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            href="/train"
            className="flex-1 inline-flex items-center justify-center rounded-full bg-stone-900 text-white h-14 font-semibold hover:bg-stone-800 transition-colors"
          >
            Upload Photos
          </Link>
          <Link
            href="/stories/new"
            className="flex-1 inline-flex items-center justify-center rounded-full border border-stone-200 h-14 font-semibold text-stone-600 hover:bg-stone-50 transition-colors"
          >
            Skip for now
          </Link>
        </div>
      </div>
    </div>
  );
}

