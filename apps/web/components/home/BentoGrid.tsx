"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ShieldCheck, Printer, Sparkles, Zap } from "lucide-react";

const childImages = [
  {
    src: "https://images.unsplash.com/photo-1519238263496-63219caa00eb?q=80&w=600&auto=format&fit=crop",
    label: "Space Style",
  },
  {
    src: "https://images.unsplash.com/photo-1602622931974-9a7a1f4c3f8d?q=80&w=600&auto=format&fit=crop",
    label: "Jungle Style",
  },
];

export function BentoGrid() {
  return (
    <section className="py-16 px-4">
      <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[320px]">
        
        {/* Card 1: Consistent Character (Large Span) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="md:col-span-2 row-span-1 rounded-3xl bg-white border border-stone-100 shadow-xl shadow-stone-200/50 overflow-hidden relative group flex flex-col md:flex-row"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-amber-50 to-orange-50 opacity-50" />
          
          {/* Text Content */}
          <div className="relative z-10 p-8 flex-1 flex flex-col justify-center">
            <div className="w-12 h-12 rounded-xl bg-orange-100 flex items-center justify-center mb-4 text-orange-600 shadow-sm">
                <Sparkles className="w-6 h-6" />
            </div>
            <h3 className="text-2xl font-serif font-bold text-stone-900 mb-3">Consistent Characters</h3>
            <p className="text-stone-600 leading-relaxed">
                We train a dedicated model on your child&apos;s face. They look like themselves—whether they are an astronaut, a wizard, or a jungle explorer.
            </p>
          </div>
          
          {/* Visual Mockup - Right Side */}
          <div className="relative h-40 md:h-full md:w-1/2 p-4 flex items-center justify-center bg-orange-50/50">
             <div className="flex gap-3 transform rotate-6 group-hover:rotate-0 transition-transform duration-500">
                {childImages.map((image) => (
                    <div key={image.label} className="relative w-32 h-40 rounded-xl bg-white shadow-lg border-4 border-white overflow-hidden flex-shrink-0">
                        <Image 
                            src={image.src}
                            alt={image.label}
                            fill
                            sizes="130px"
                            className="object-cover"
                            priority
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-2 py-1 backdrop-blur-sm">
                            {image.label}
                        </div>
                    </div>
                ))}
             </div>
          </div>
        </motion.div>

        {/* Card 2: Print Ready (Tall) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="rounded-3xl bg-stone-900 text-white border border-stone-800 shadow-xl overflow-hidden relative group"
        >
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20" />
          <div className="relative z-10 p-8 h-full flex flex-col">
            <div className="w-12 h-12 rounded-xl bg-stone-800 flex items-center justify-center mb-4 text-white shadow-inner border border-stone-700">
                <Printer className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-serif font-bold mb-2">Print Ready</h3>
            <p className="text-stone-400 text-sm mb-8">
                High-DPI exports perfect for framing.
            </p>
            <div className="flex-1 relative flex items-end justify-center">
                <div className="w-3/4 h-3/4 bg-white rounded-t-lg shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-transform duration-500 border-t border-x border-stone-700 p-2">
                    <div className="w-full h-full bg-stone-100 rounded-sm flex items-center justify-center overflow-hidden">
                        <span className="text-stone-300 font-serif text-6xl">A</span>
                    </div>
                </div>
            </div>
          </div>
        </motion.div>

        {/* Card 3: Privacy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="rounded-3xl bg-emerald-50/50 border border-emerald-100 shadow-xl shadow-emerald-100/50 overflow-hidden relative"
        >
          <div className="relative z-10 p-8 h-full flex flex-col justify-center items-center text-center">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center mb-6 text-emerald-600 shadow-sm">
                <ShieldCheck className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-serif font-bold text-emerald-900 mb-3">Safe & Private</h3>
            <p className="text-emerald-800/70 text-sm leading-relaxed">
                We delete all training photos within 24 hours. Your child&apos;s AI model is encrypted and accessible only by you.
            </p>
          </div>
        </motion.div>

        {/* Card 4: Infinite Stories (Large Span) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 }}
          className="md:col-span-2 rounded-3xl bg-white border border-stone-100 shadow-xl shadow-stone-200/50 overflow-hidden relative group"
        >
           {/* Cleaner Background */}
           <div className="absolute inset-0 bg-gradient-to-r from-purple-50 to-white" />
           
           <div className="relative z-10 p-8 flex flex-col md:flex-row items-center justify-between h-full gap-8">
                <div className="flex-1 max-w-md">
                    <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-4 text-purple-600 shadow-sm">
                        <Zap className="w-6 h-6" />
                    </div>
                    <h3 className="text-2xl font-serif font-bold text-stone-900 mb-3">Infinite Adventures</h3>
                    <p className="text-stone-600 leading-relaxed">
                        Space, Dinosaurs, Underwater, or Fantasy. If you can imagine it, we can write and illustrate it.
                    </p>
                </div>
                
                <div className="flex flex-col gap-3">
                    <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm flex items-center gap-3 w-48 transform translate-x-4 group-hover:translate-x-0 transition-transform duration-500">
                        <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">🚀</div>
                        <span className="text-sm font-medium text-stone-700">Space Quest</span>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm flex items-center gap-3 w-48 transform -translate-x-4 group-hover:translate-x-0 transition-transform duration-500 delay-75">
                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">🦖</div>
                        <span className="text-sm font-medium text-stone-700">Dino Park</span>
                    </div>
                    <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm flex items-center gap-3 w-48 transform translate-x-2 group-hover:translate-x-0 transition-transform duration-500 delay-100">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">🌊</div>
                        <span className="text-sm font-medium text-stone-700">Deep Ocean</span>
                    </div>
                </div>
           </div>
        </motion.div>

      </div>
    </section>
  );
}
