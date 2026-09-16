"use client";
import { motion } from "motion/react";
import { Camera, Wand2, BookOpen } from "lucide-react";

const steps = [
  {
    id: "01",
    title: "Upload Photos",
    icon: Camera,
    description: "Upload 5-10 clear photos of your child. Our AI learns their unique features in minutes.",
  },
  {
    id: "02",
    title: "Choose Adventure",
    icon: Wand2,
    status: "MAGIC",
    description: "Pick a theme—Space, Dinosaurs, Fantasy—or type your own custom idea.",
  },
  {
    id: "03",
    title: "Read Together",
    icon: BookOpen,
    description: "Get a fully illustrated storybook in seconds. Read online or order a hardcover print.",
  },
];

export function Process() {
  return (
    <section className="py-24 bg-stone-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-stone-900 mb-4 font-serif">
            How The Magic Happens
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {steps.map((step, index) => (
            <motion.div
              key={step.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              viewport={{ once: true }}
              className="bg-white rounded-2xl p-8 shadow-sm border border-stone-100 relative overflow-hidden group hover:shadow-md transition-shadow"
            >
              {/* Connecting Line (Visual Only) */}
              {index !== steps.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-[2px] bg-stone-200 z-10" />
              )}

              <div className="mb-8 relative">
                <div className="w-16 h-16 bg-amber-50 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform duration-300">
                  <step.icon className="w-8 h-8 text-amber-600" />
                </div>
                
                {step.status === "MAGIC" && (
                  <span className="absolute -top-2 -right-2 bg-purple-50 text-purple-600 text-[10px] font-bold px-2 py-1 rounded-full border border-purple-100">
                    {step.status}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <span className="text-sm font-mono text-stone-400">{step.id}</span>
                <h3 className="text-xl font-semibold text-stone-900">{step.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
