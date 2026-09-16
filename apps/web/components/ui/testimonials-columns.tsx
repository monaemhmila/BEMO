"use client";

import React from "react";
import { motion } from "motion/react";

export const TestimonialsColumn = (props: {
  className?: string;
  testimonials: {
    text: string;
    image: string;
    name: string;
    role: string;
  }[];
  duration?: number;
}) => {
  return (
    <div className={props.className}>
      <motion.div
        animate={{
          translateY: "-50%",
        }}
        transition={{
          duration: props.duration || 10,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop",
        }}
        className="flex flex-col gap-6 pb-6 bg-transparent"
      >
        {[...new Array(2)].map((_, index) => (
          <React.Fragment key={index}>
            {props.testimonials.map(({ text, image, name, role }, i) => (
              <div className="p-6 rounded-3xl border border-stone-100 bg-white shadow-sm" key={i}>
                <p className="text-stone-600 text-sm leading-relaxed">&quot;{text}&quot;</p>
                <div className="flex items-center gap-2 mt-4">
                  <img
                    width={40}
                    height={40}
                    src={image}
                    alt={name}
                    className="h-10 w-10 rounded-full bg-stone-100 object-cover"
                  />
                  <div className="flex flex-col">
                    <div className="font-serif font-bold text-stone-900 text-sm">{name}</div>
                    <div className="text-xs text-stone-500">{role}</div>
                  </div>
                </div>
              </div>
            ))}
          </React.Fragment>
        ))}
      </motion.div>
    </div>
  );
};

