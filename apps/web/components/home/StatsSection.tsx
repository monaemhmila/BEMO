"use client";

import { motion } from "framer-motion";
import { useInView } from "framer-motion";
import { useRef } from "react";
import { stats } from "./data";

export function StatsSection() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0 }}
      animate={isInView ? { opacity: 1 } : { opacity: 0 }}
      transition={{ duration: 0.8 }}
      className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-52 flex flex-col items-center"
    >
      <div className="absolute rounded-t-2xl inset-0 bg-gradient-to-b from-purple-500/10 via-transparent to-transparent" />
      
      <div className="relative pt-16 pb-16 w-full flex flex-col items-center">
        <div className="text-center mb-24 w-full max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-primary mb-6">
            Our{" "}
            <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
              Impact
            </span>
          </h2>
          <p className="text-muted-foreground text-lg">
            Join thousands of satisfied users who have transformed their portraits
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-12 md:gap-16 w-full max-w-5xl mt-8">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={
                isInView ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }
              }
              transition={{ delay: index * 0.1, duration: 0.5 }}
              className="text-center space-y-6 flex flex-col items-center"
            >
              <div className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                {stat.value}
              </div>
              <p className="text-muted-foreground text-lg md:text-xl">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}