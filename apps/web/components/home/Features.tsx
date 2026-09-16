"use client";

import { motion } from "framer-motion";
import { ShieldCheck, Zap, Heart, Sparkles } from "lucide-react";

const FEATURES = [
  {
    title: "Consistent Character",
    description:
      "We train a dedicated AI model on your child's face, so they look like themselves in every single illustration.",
    icon: <Heart className="w-6 h-6 text-pink-500" />,
  },
  {
    title: "Infinite Adventures",
    description:
      "Space, Dinosaurs, Underwater, or Fantasy. If you can imagine it, we can write and illustrate it.",
    icon: <Zap className="w-6 h-6 text-amber-500" />,
  },
  {
    title: "Safe & Private",
    description:
      "Your child's photos are used ONLY to train their private model. We delete training data after 24 hours.",
    icon: <ShieldCheck className="w-6 h-6 text-green-500" />,
  },
  {
    title: "Professional Quality",
    description:
      "High-resolution 4K images perfect for printing. Turn your generated stories into real hardcover books.",
    icon: <Sparkles className="w-6 h-6 text-purple-500" />,
  },
];

export function Features() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 px-4">
      {FEATURES.map((feature, index) => (
        <motion.div
          key={feature.title}
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1, duration: 0.5 }}
          viewport={{ once: true }}
          className="p-6 rounded-2xl bg-white border border-stone-100 shadow-xl shadow-stone-200/50 hover:shadow-2xl hover:-translate-y-1 transition-all duration-300"
        >
          <div className="w-12 h-12 rounded-xl bg-stone-50 flex items-center justify-center mb-4">
            {feature.icon}
          </div>
          <h3 className="text-xl font-serif font-bold text-stone-900 mb-2">
            {feature.title}
          </h3>
          <p className="text-stone-500 leading-relaxed">
            {feature.description}
          </p>
        </motion.div>
      ))}
    </div>
  );
}
