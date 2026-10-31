"use client";

import { motion } from "framer-motion";

export function TypeOnText({
  children,
  className,
  delay = 0,
}: {
  children: string;
  className?: string;
  delay?: number;
}) {
  return (
    <span className={className} aria-label={children}>
      {Array.from(children).map((character, index) => (
        <motion.span
          key={`${character}-${index}`}
          aria-hidden="true"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: delay + index * 0.025,
            duration: 0.22,
            ease: "easeOut",
          }}
          className="inline-block"
        >
          {character === " " ? "\u00a0" : character}
        </motion.span>
      ))}
    </span>
  );
}
