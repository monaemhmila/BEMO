"use client";

import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowRight, Star } from "lucide-react";

export function HeroHeader() {
  const router = useRouter();

  return (
    <div className="flex flex-col items-center text-center space-y-8 pt-16 md:pt-24 relative z-10">
      
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="inline-flex items-center rounded-full border border-amber-200/60 bg-white/50 backdrop-blur-sm px-4 py-1.5 text-sm font-medium text-amber-800 shadow-[0_2px_10px_-2px_rgba(245,158,11,0.2)] hover:bg-white/80 transition-colors cursor-default"
      >
        <Star className="mr-2 h-3.5 w-3.5 fill-amber-500 text-amber-500 animate-pulse" />
        The #1 AI Storybook Creator for Kids
      </motion.div>

      {/* Main Heading with Staggered Reveal */}
      <h1 className="font-serif text-5xl md:text-7xl lg:text-8xl font-bold tracking-tight text-stone-900 max-w-6xl mx-auto leading-[1.1]">
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.8 }}
          className="block"
        >
          Make your child the
        </motion.span>
        <motion.span
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.8, type: "spring" }}
          className="relative inline-block mt-2"
        >
            <span className="relative z-10 bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">hero</span>
            <svg className="absolute w-full h-4 -bottom-1 left-0 text-amber-200 z-0" viewBox="0 0 100 10" preserveAspectRatio="none">
                <path d="M0 5 Q 50 10 100 5" stroke="currentColor" strokeWidth="8" fill="none" />
            </svg>
        </motion.span>{" "}
        <motion.span
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.8 }}
        >
         of every story.
        </motion.span>
      </h1>

      {/* Subheading */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 0.8 }}
        className="text-xl md:text-2xl text-stone-500 max-w-2xl mx-auto leading-relaxed"
      >
        Instantly generate magical, illustrated bedtime stories starring your little one. 
        Endless adventures, one subscription.
      </motion.p>

      {/* CTA Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.2, duration: 0.8 }}
        className="flex flex-col sm:flex-row items-center gap-4 pt-8"
      >
        <SignedOut>
          <Button
            asChild
            size="lg"
            className="group h-16 px-10 text-xl rounded-full bg-stone-900 hover:bg-stone-800 text-white shadow-2xl hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.3)] hover:-translate-y-1 transition-all duration-300"
          >
            <SignInButton mode="modal">
              <span className="flex items-center gap-3">
                Start Writing Free
                <div className="bg-white/20 rounded-full p-1">
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </div>
              </span>
            </SignInButton>
          </Button>
        </SignedOut>
        
        <SignedIn>
          <Button
            onClick={() => router.push("/storybook/dashboard")}
            size="lg"
            className="h-16 px-10 text-xl rounded-full bg-amber-600 hover:bg-amber-700 text-white shadow-xl hover:shadow-amber-600/30 hover:-translate-y-1 transition-all duration-300"
          >
            Go to Library
            <ArrowRight className="ml-2 w-6 h-6" />
          </Button>
        </SignedIn>

        <p className="text-sm text-stone-400 mt-4 sm:mt-0 sm:ml-4 animate-pulse">
            ✨ 20 Free Credits included
        </p>
      </motion.div>
    </div>
  );
}
