"use client";
import { motion } from "motion/react";
import { Heart, ShieldCheck, Sparkles, Zap, Smile, Lock } from "lucide-react";

const benefits = [
  {
    title: "Consistent Characters",
    description: "Our AI model trains on your child's photos to keep their face 100% consistent across every page.",
    icon: Heart,
    colSpan: "col-span-1 md:col-span-2",
    visual: "character" 
  },
  {
    title: "Educational Values",
    description: "Stories designed to teach kindness, courage, and curiosity. Filter by moral or lesson.",
    icon: Sparkles,
    colSpan: "col-span-1 md:col-span-2",
    visual: "values"
  },
  {
    title: "Safe & Private",
    description: "Your photos are used ONLY to train your private model. We delete training data after 24h.",
    icon: ShieldCheck,
    colSpan: "col-span-1 md:col-span-2",
    visual: "privacy"
  },
  {
    title: "Infinite Adventures",
    description: "Space, Jungle, Underwater? Choose from 50+ themes or type your own custom prompt.",
    icon: Zap,
    colSpan: "col-span-1 md:col-span-2",
    visual: "infinite"
  }
];

export function Benefits() {
  return (
    <section className="py-24 bg-white">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-stone-900 mb-4 font-serif">
            Why Parents Love<br />Tales.ai
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              viewport={{ once: true }}
              className={`${benefit.colSpan} group relative overflow-hidden rounded-3xl border border-stone-100 bg-stone-50/30 p-8 hover:bg-white hover:shadow-xl hover:shadow-stone-200/40 transition-all duration-300`}
            >
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="mb-8">
                   {/* Visual Placeholder - SaaS Style */}
                   <div className="h-40 w-full bg-white rounded-2xl border border-stone-100 flex items-center justify-center mb-6 overflow-hidden relative shadow-sm group-hover:shadow-md transition-shadow">
                      <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(68,64,60,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:250%_250%,100%_100%] animate-[shimmer_3s_infinite]" />
                      
                      {benefit.visual === "character" && (
                        <div className="flex gap-3 items-center">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className="relative w-16 h-20 bg-stone-50 rounded-lg border border-stone-200 overflow-hidden shadow-sm group-hover:-translate-y-1 transition-transform" style={{ transitionDelay: `${i * 100}ms` }}>
                                    <div className="absolute top-2 left-2 w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                                        <Smile className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div className="absolute bottom-0 w-full h-1/2 bg-gradient-to-t from-stone-100 to-transparent" />
                                </div>
                            ))}
                        </div>
                      )}
                      {benefit.visual === "values" && (
                          <div className="flex flex-col gap-2 w-3/4">
                              <div className="flex items-center justify-between bg-stone-50 px-3 py-2 rounded-lg border border-stone-100">
                                  <span className="text-xs font-bold text-stone-600">Theme: Courage</span>
                                  <div className="w-8 h-4 bg-green-100 rounded-full flex items-center justify-end px-1">
                                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                                  </div>
                              </div>
                              <div className="flex items-center justify-between bg-stone-50 px-3 py-2 rounded-lg border border-stone-100 opacity-60">
                                  <span className="text-xs font-bold text-stone-600">Tone: Gentle</span>
                                  <div className="w-8 h-4 bg-stone-200 rounded-full" />
                              </div>
                          </div>
                      )}
                      {benefit.visual === "privacy" && (
                          <div className="flex items-center justify-center relative">
                             <div className="absolute w-32 h-32 bg-green-50/50 rounded-full animate-pulse" />
                             <div className="w-16 h-16 bg-white rounded-xl border border-stone-200 shadow-sm flex items-center justify-center relative z-10">
                                <Lock className="w-6 h-6 text-stone-800" />
                             </div>
                             <div className="absolute -top-2 -right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                                 ENCRYPTED
                             </div>
                          </div>
                      )}
                      {benefit.visual === "infinite" && (
                          <div className="grid grid-cols-2 gap-3 w-3/4">
                              <div className="h-12 bg-purple-50 rounded-lg border border-purple-100 flex items-center justify-center text-xs font-bold text-purple-400">Space</div>
                              <div className="h-12 bg-blue-50 rounded-lg border border-blue-100 flex items-center justify-center text-xs font-bold text-blue-400">Ocean</div>
                              <div className="h-12 bg-orange-50 rounded-lg border border-orange-100 flex items-center justify-center text-xs font-bold text-orange-400">Jungle</div>
                              <div className="h-12 bg-stone-50 rounded-lg border border-dashed border-stone-200 flex items-center justify-center text-stone-400 text-xs">+ More</div>
                          </div>
                      )}
                   </div>

                   <h3 className="text-xl font-semibold text-stone-900 mb-2">{benefit.title}</h3>
                   <p className="text-stone-600 text-sm leading-relaxed max-w-sm">
                     {benefit.description}
                   </p>
                </div>
                
                <div className="w-10 h-10 rounded-full bg-white border border-stone-200 flex items-center justify-center group-hover:bg-stone-900 group-hover:border-stone-900 transition-colors shadow-sm">
                  <benefit.icon className="w-5 h-5 text-stone-900 group-hover:text-white transition-colors" />
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
