"use client";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { BookOpen, Star, PlayCircle, Wand2, Heart, Sparkles } from "lucide-react";
import { SignInButton, SignedIn, SignedOut } from "@clerk/nextjs";
import Link from "next/link";

export function Hero() {
  return (
    <section className="relative pt-32 pb-20 md:pt-48 md:pb-32 overflow-hidden bg-[#faf9f6]">
      {/* Background Effects (DefendLab Style - Selected Area Greenish) */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        
        {/* 1. Grid Overlay - Subtle Texture */}
        <div 
            className="absolute inset-0 opacity-[0.03]" 
            style={{ 
                backgroundImage: `linear-gradient(#1c1917 1px, transparent 1px), linear-gradient(90deg, #1c1917 1px, transparent 1px)`, 
                backgroundSize: '40px 40px',
                maskImage: 'linear-gradient(to bottom, black 40%, transparent 90%)'
            }} 
        />

        {/* 2. The "Selected Area" Green Gradient - A central beam/glow, not the whole section */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-[800px] bg-gradient-to-b from-emerald-50 via-emerald-50/30 to-transparent opacity-80" />

        {/* 3. Concentrated Glowing Blobs (The "Multicolor Shadow" effect) */}
        {/* Main Green Glow */}
        <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-emerald-200/20 rounded-full blur-[100px] mix-blend-multiply" />
        
        {/* Secondary Teal Glow */}
        <div className="absolute top-[10%] right-[20%] w-[400px] h-[400px] bg-teal-100/30 rounded-full blur-[80px] mix-blend-multiply animate-blob animation-delay-2000" />
        
        {/* Tertiary Soft Green Glow */}
        <div className="absolute top-[5%] left-[20%] w-[500px] h-[500px] bg-green-100/30 rounded-full blur-[80px] mix-blend-multiply animate-blob animation-delay-4000" />
      </div>

      <div className="container mx-auto px-4 relative z-10">
        <div className="text-center max-w-4xl mx-auto mb-12">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
               <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 backdrop-blur-sm border border-emerald-100 text-emerald-700 text-sm font-medium mb-6 shadow-sm hover:bg-white transition-colors cursor-default">
                  <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
                  The #1 AI Storybook Creator for Kids
               </div>
               <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-stone-900 mb-6 font-serif">
                Make Your Child the<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Hero of Every Story</span>
              </h1>
              <p className="text-xl text-stone-600 mb-8 max-w-2xl mx-auto leading-relaxed">
                Instantly generate magical, illustrated bedtime stories starring your little one. 
                Endless adventures, one subscription.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <SignedOut>
                   <Button size="lg" className="bg-stone-900 text-white hover:bg-stone-800 rounded-full px-8 h-12 text-base shadow-xl shadow-stone-900/10 hover:shadow-stone-900/20 transition-all hover:-translate-y-0.5">
                      <SignInButton mode="modal">Start Creating Free</SignInButton>
                   </Button>
                   <Link href="/stories">
                      <Button size="lg" variant="outline" className="bg-white/80 backdrop-blur-sm border-stone-200 text-stone-900 hover:bg-white rounded-full px-8 h-12 text-base hover:shadow-lg hover:shadow-stone-200/50 transition-all">
                        View Library
                      </Button>
                   </Link>
                </SignedOut>
                <SignedIn>
                    <Link href="/dashboard">
                      <Button size="lg" className="bg-stone-900 text-white hover:bg-stone-800 rounded-full px-8 h-12 text-base shadow-xl shadow-stone-900/10 hover:shadow-stone-900/20 transition-all hover:-translate-y-0.5">
                        Go to Dashboard
                      </Button>
                    </Link>
                    <Link href="/stories">
                      <Button size="lg" variant="outline" className="bg-white/80 backdrop-blur-sm border-stone-200 text-stone-900 hover:bg-white rounded-full px-8 h-12 text-base hover:shadow-lg hover:shadow-stone-200/50 transition-all">
                        My Library
                      </Button>
                    </Link>
                </SignedIn>
              </div>
            </motion.div>
        </div>

        {/* Storybook Interface Mockup */}
        <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative max-w-6xl mx-auto"
        >
            {/* Main Interface Container with Glassmorphism */}
            <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-stone-900/10 border border-white/50 overflow-hidden p-2 md:p-4 ring-1 ring-stone-900/5">
                <div className="bg-stone-50 rounded-2xl border border-stone-200/60 overflow-hidden min-h-[500px] md:min-h-[600px] relative flex flex-col md:flex-row shadow-inner">
                    
                    {/* Editor Sidebar (Left) - Only visible on large screens for "SaaS" feel */}
                    <div className="hidden lg:flex w-20 border-r border-stone-200 bg-white flex-col items-center py-6 gap-6">
                         <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100">
                            <Wand2 className="w-5 h-5" />
                         </div>
                         <div className="w-10 h-10 rounded-xl hover:bg-stone-50 text-stone-400 hover:text-stone-600 flex items-center justify-center transition-colors cursor-pointer">
                            <BookOpen className="w-5 h-5" />
                         </div>
                         <div className="w-10 h-10 rounded-xl hover:bg-stone-50 text-stone-400 hover:text-stone-600 flex items-center justify-center transition-colors cursor-pointer">
                            <Heart className="w-5 h-5" />
                         </div>
                         <div className="mt-auto w-8 h-8 rounded-full bg-stone-200" />
                    </div>

                    {/* Main Content Area */}
                    <div className="flex-1 flex flex-col bg-[#fffdf5]">
                        {/* Top Bar */}
                        <div className="h-14 border-b border-stone-100 flex items-center justify-between px-6 bg-white/50 backdrop-blur-sm">
                             <div className="flex items-center gap-2">
                                 <span className="text-xs font-bold text-stone-400 uppercase tracking-wider">Draft</span>
                                 <span className="text-stone-300">/</span>
                                 <span className="text-sm font-semibold text-stone-800">The Magical Candy Kingdom</span>
                             </div>
                             <div className="flex items-center gap-3">
                                 <div className="flex -space-x-2">
                                     <div className="w-6 h-6 rounded-full border-2 border-white bg-pink-100" />
                                     <div className="w-6 h-6 rounded-full border-2 border-white bg-blue-100" />
                                 </div>
                                 <Button size="sm" className="h-8 rounded-full bg-stone-900 text-xs">Save</Button>
                             </div>
                        </div>

                        {/* Story Canvas */}
                        <div className="flex-1 p-8 md:p-12 flex flex-col md:flex-row gap-8 overflow-hidden">
                            {/* Text Column */}
                            <div className="flex-1 flex flex-col justify-center space-y-6">
                                <div className="w-12 h-1 bg-emerald-500 rounded-full" />
                                <div className="font-serif text-3xl md:text-4xl text-stone-900 leading-tight">
                                   &quot;Leo looked up at the <span className="bg-emerald-100 px-1 rounded text-emerald-800 cursor-pointer hover:bg-emerald-200 transition-colors border-b-2 border-emerald-300">Emerald Mountain</span>.&quot;
                                </div>
                                <p className="text-lg text-stone-600 leading-relaxed font-serif">
                                    The peak was covered in powdered sugar snow. He adjusted his chocolate helmet, knowing the legendary Golden Lollipop was waiting at the top.
                                </p>
                                <div className="flex items-center gap-4 pt-4">
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-200 shadow-sm text-xs font-medium text-stone-600 cursor-pointer hover:border-emerald-300 transition-colors">
                                        <Wand2 className="w-3 h-3 text-emerald-500" /> Rewrite
                                    </div>
                                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-stone-200 shadow-sm text-xs font-medium text-stone-600 cursor-pointer hover:border-emerald-300 transition-colors">
                                        <PlayCircle className="w-3 h-3 text-emerald-500" /> Read Aloud
                                    </div>
                                </div>
                            </div>

                            {/* Image Canvas */}
                            <div className="flex-1 relative rounded-2xl overflow-hidden shadow-2xl shadow-stone-900/10 border border-stone-200 bg-stone-100 group">
                                 {/* Pseudo-Image Placeholder with high quality gradient/shapes */}
                                 <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-100" />
                                 
                                 {/* Abstract "Mountain" Composition */}
                                 <div className="absolute bottom-0 left-0 right-0 h-[60%] bg-gradient-to-t from-emerald-800/10 to-transparent" />
                                 <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-48 h-48 bg-gradient-to-t from-emerald-600 to-teal-400 rounded-full blur-3xl opacity-40" />
                                 
                                 {/* Character Placeholder */}
                                 <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-10 w-64 h-64">
                                     <div className="relative w-full h-full">
                                         {/* Simple silhouette for SaaS abstraction */}
                                         <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-24 h-32 bg-stone-900/10 rounded-full blur-xl" />
                                         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-32 h-40 bg-gradient-to-b from-teal-400 to-emerald-600 rounded-t-full shadow-lg" /> 
                                         <div className="absolute bottom-36 left-1/2 -translate-x-1/2 w-20 h-20 bg-[#ffdbac] rounded-full shadow-md" />
                                     </div>
                                 </div>

                                 {/* AI Generation Tag */}
                                 <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 shadow-lg">
                                     <Sparkles className="w-3 h-3 text-emerald-400" /> AI Generated
                                 </div>

                                 {/* Hover Action Overlay */}
                                 <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                      <Button className="rounded-full bg-white text-stone-900 hover:bg-stone-50 shadow-xl">Edit Image</Button>
                                 </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Floating Elements (Decorations) */}
            <motion.div 
                className="absolute -top-6 -left-6 bg-white p-4 rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-stone-100 flex gap-3 items-center"
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
                 <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                     <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse" />
                 </div>
                 <div>
                     <div className="text-xs text-stone-500 font-medium">System Status</div>
                     <div className="text-sm font-bold text-stone-800">Generating Story...</div>
                 </div>
            </motion.div>

            <motion.div 
                className="absolute -bottom-8 -right-8 bg-white p-4 rounded-xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-stone-100 hidden md:flex gap-3 items-center"
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
            >
                 <div className="flex -space-x-3">
                     <div className="w-8 h-8 rounded-full border-2 border-white bg-stone-200" />
                     <div className="w-8 h-8 rounded-full border-2 border-white bg-stone-300" />
                     <div className="w-8 h-8 rounded-full border-2 border-white bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">+2k</div>
                 </div>
                 <div className="text-sm font-bold text-stone-800">Happy Parents</div>
            </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
