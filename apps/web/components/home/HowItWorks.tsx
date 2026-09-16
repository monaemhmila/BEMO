"use client";

import { motion } from "framer-motion";
import { Wand2, BookOpen, Camera } from "lucide-react";

const STEPS = [
  {
    number: "01",
    title: "Upload Photos",
    description: "Upload 5-10 clear photos of your child's face. Our AI learns their unique features in minutes.",
    icon: <Camera className="w-6 h-6 text-stone-600" />,
    color: "bg-blue-50 border-blue-100"
  },
  {
    number: "02",
    title: "Choose an Adventure",
    description: "Pick a theme (Space, Jungle, Magic Castle) and an art style (Watercolor, Pixar, Claymation).",
    icon: <Wand2 className="w-6 h-6 text-purple-600" />,
    color: "bg-purple-50 border-purple-100"
  },
  {
    number: "03",
    title: "Read & Share",
    description: "Get a complete, illustrated storybook in 2 minutes. Read it online or order a hardcover print.",
    icon: <BookOpen className="w-6 h-6 text-amber-600" />,
    color: "bg-amber-50 border-amber-100"
  },
];

export function HowItWorks() {
  return (
    <section className="py-12">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <span className="text-amber-600 font-serif italic text-xl">Simple Magic</span>
        <h2 className="text-3xl md:text-4xl font-serif font-bold text-stone-800 mt-2">
          From Photo to Storybook
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        {STEPS.map((step, index) => (
          <motion.div
            key={step.number}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: index * 0.2 }}
            className={`relative p-8 rounded-3xl border-2 ${step.color} flex flex-col items-start h-full hover:shadow-lg transition-shadow duration-300`}
          >
            <div className="flex items-center justify-between w-full mb-6">
                <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-sm">
                    {step.icon}
                </div>
                <span className="text-4xl font-serif font-bold text-stone-200/80">
                    {step.number}
                </span>
            </div>
            
            <h3 className="text-xl font-serif font-bold text-stone-900 mb-3">
                {step.title}
            </h3>
            <p className="text-stone-600 leading-relaxed">
                {step.description}
            </p>

            {/* Dotted connector line for desktop */}
            {index !== STEPS.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-6 w-8 border-t-2 border-dashed border-stone-300 z-10" />
            )}
          </motion.div>
        ))}
      </div>
    </section>
  );
}
