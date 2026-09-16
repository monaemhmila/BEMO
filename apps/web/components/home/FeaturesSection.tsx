"use client";
import { motion } from "motion/react";
import { Rocket, Crown, Ghost } from "lucide-react";

const features = [
  {
    title: "Sci-Fi & Space",
    description: "Blast off to new planets. Your child becomes the captain of their own starship.",
    icon: Rocket,
    tags: ["ADVENTURE", "SPACE"],
  },
  {
    title: "Fairy Tales & Fantasy",
    description: "Dragons, castles, and magic spells. Classic storytelling reimagined for your little prince or princess.",
    icon: Crown,
    tags: ["MAGIC", "ROYALTY"],
  },
  {
    title: "Mystery & Fun",
    description: "Solve playful mysteries or explore haunted houses (the friendly kind!). Perfect for curious minds.",
    icon: Ghost,
    tags: ["FUN", "MYSTERY"],
  },
];

export function FeaturesSection() {
  return (
    <section className="py-24 bg-stone-50">
      <div className="container mx-auto px-4">
        <div className="mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-stone-900 mb-4 font-serif">
            Built For Sweet<br />Dreams
          </h2>
          <p className="text-stone-600 max-w-lg">
            Choose from hundreds of themes or create your own. The only limit is your imagination.
          </p>
          <div className="mt-6">
              <button className="bg-stone-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-stone-800 transition-colors">
                  Explore Library
              </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.2 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              {/* Visual Card */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-100 h-48 flex flex-col items-center justify-center relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-stone-200 to-stone-100" />
                  
                  {index === 0 && (
                      <div className="relative w-24 h-24">
                          <div className="absolute inset-0 bg-blue-100 rounded-full opacity-50 animate-pulse" />
                          <Rocket className="w-12 h-12 text-blue-600 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                      </div>
                  )}
                  
                  {index === 1 && (
                      <div className="flex gap-2 items-center">
                          <Crown className="w-12 h-12 text-amber-400" />
                      </div>
                  )}

                  {index === 2 && (
                      <div className="flex gap-2">
                         <Ghost className="w-12 h-12 text-purple-400" />
                      </div>
                  )}

              </div>

              <div>
                <div className="flex gap-2 mb-3">
                    {feature.tags.map(tag => (
                        <span key={tag} className="text-[10px] font-bold px-2 py-1 rounded bg-stone-100 text-stone-500 tracking-wider">
                            {tag}
                        </span>
                    ))}
                </div>
                <h3 className="text-xl font-semibold text-stone-900 mb-2">{feature.title}</h3>
                <p className="text-stone-600 text-sm leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

