"use client";
import { motion } from "motion/react";

export function MagicEngine() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4 text-center">
        <div className="mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-stone-900 mb-4 font-serif">
            Weave Magic Into Every Page
          </h2>
          <p className="text-stone-600 max-w-2xl mx-auto">
            Our engine combines your inputs to generate a unique story every time.
          </p>
        </div>

        <div className="max-w-4xl mx-auto relative h-[400px] flex items-center justify-center">
          {/* Central Node */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            whileInView={{ scale: 1, opacity: 1 }}
            viewport={{ once: true }}
            className="relative z-20 bg-amber-50 p-8 rounded-full shadow-xl border-4 border-white w-48 h-48 flex flex-col items-center justify-center"
          >
            <span className="font-serif font-bold text-2xl text-amber-900">The Story<br/>Engine</span>
            <div className="absolute -top-2 -right-2 w-4 h-4 bg-amber-400 rounded-full animate-pulse" />
          </motion.div>

          {/* Connected Nodes */}
          {[
              { label: "YOUR PHOTOS", color: "bg-stone-100 text-stone-700", x: "-translate-x-48 -translate-y-24" },
              { label: "THEME", color: "bg-purple-100 text-purple-700", x: "-translate-x-56 translate-y-0" },
              { label: "MORAL", color: "bg-blue-100 text-blue-700", x: "-translate-x-48 translate-y-24" },
              { label: "ILLUSTRATION", color: "bg-orange-100 text-orange-700", x: "translate-x-48 -translate-y-24" },
              { label: "TEXT", color: "bg-stone-100 text-stone-700", x: "translate-x-56 translate-y-0" },
              { label: "AUDIO", color: "bg-green-100 text-green-700", x: "translate-x-48 translate-y-24" },
          ].map((node, i) => (
              <motion.div
                  key={i}
                  initial={{ opacity: 0 }}
                  whileInView={{ opacity: 1 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  viewport={{ once: true }}
                  className={`absolute z-10 px-4 py-2 rounded-full text-xs font-bold shadow-sm border border-white ${node.color} ${node.x}`}
              >
                  {node.label}
              </motion.div>
          ))}

          {/* Connecting Lines (Decorative) */}
          <svg className="absolute inset-0 w-full h-full z-0 pointer-events-none" style={{ opacity: 0.2 }}>
              <path d="M300,200 L500,200" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <path d="M300,150 L500,200" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <path d="M300,250 L500,200" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <path d="M500,200 L700,150" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <path d="M500,200 L700,200" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
              <path d="M500,200 L700,250" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" />
          </svg>
        </div>
      </div>
    </section>
  );
}

