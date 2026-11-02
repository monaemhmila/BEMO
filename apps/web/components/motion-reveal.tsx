"use client";

import { motion, type HTMLMotionProps } from "framer-motion";

import { revealVariants } from "@/lib/motion";

type MotionRevealProps = HTMLMotionProps<"div"> & {
  amount?: number;
};

export function MotionReveal({ amount = 0.18, children, ...props }: MotionRevealProps) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount }}
      variants={revealVariants}
      {...props}
    >
      {children}
    </motion.div>
  );
}

