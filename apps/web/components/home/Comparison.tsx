"use client";

import { Check, X, Zap } from "lucide-react";

const FEATURES = [
  {
    name: "Character Consistency",
    description: "Keeps your child's face recognizable in every scene.",
    us: true,
    them: false,
  },
  {
    name: "Story Personalization",
    description: "Plots generated specifically for your child's interests.",
    us: true,
    them: false,
  },
  {
    name: "Artistic Quality",
    description: "High-fidelity, studio-grade illustration styles.",
    us: true,
    them: "Varies",
  },
  {
    name: "Print Resolution",
    description: "300 DPI output ready for physical book printing.",
    us: true,
    them: false,
  },
  {
    name: "Audio Narration",
    description: "Professional voiceovers included with every story.",
    us: true,
    them: false,
  },
];

export function Comparison() {
  return (
    <section className="py-24 bg-stone-50">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="text-center mb-16">
          <h2 className="font-serif text-4xl font-bold text-stone-900 mb-4">
            The Tales.ai Difference
          </h2>
          <p className="text-stone-600 text-lg max-w-2xl mx-auto">
            See why parents are switching from generic AI tools to our dedicated
            storybook platform.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-stone-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] border-collapse">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50/50">
                  <th className="text-left p-6 w-1/2 text-sm font-semibold text-stone-500 uppercase tracking-wider align-bottom">
                    Features
                  </th>
                  <th className="p-6 w-1/4 text-center border-l border-stone-100 align-bottom pb-6">
                    <span className="text-stone-400 font-medium text-sm block">Other Apps</span>
                  </th>
                  <th className="p-6 w-1/4 text-center bg-amber-50/30 border-l border-amber-100 align-bottom pb-6 relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-amber-500" />
                    <div className="flex items-center justify-center gap-2">
                      <span className="font-serif font-bold text-xl text-stone-900">Tales.ai</span>
                      <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {FEATURES.map((feature, i) => (
                  <tr
                    key={i}
                    className="border-b border-stone-100 last:border-0 hover:bg-stone-50/30 transition-colors"
                  >
                    <td className="p-6 text-left align-middle">
                      <div className="flex flex-col">
                        <h3 className="font-semibold text-stone-900 text-base mb-1">
                          {feature.name}
                        </h3>
                        <p className="text-sm text-stone-500 leading-relaxed hidden md:block">
                          {feature.description}
                        </p>
                      </div>
                    </td>
                    <td className="p-6 text-center border-l border-stone-100 align-middle text-stone-400">
                      <div className="flex justify-center">
                        {feature.them === false ? (
                          <X className="w-5 h-5 text-stone-300" />
                        ) : feature.them === true ? (
                          <Check className="w-5 h-5" />
                        ) : (
                          <span className="text-sm font-medium">{feature.them}</span>
                        )}
                      </div>
                    </td>
                    <td className="p-6 text-center bg-amber-50/30 border-l border-amber-100 align-middle">
                      <div className="flex justify-center">
                        {feature.us === true ? (
                          <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shadow-sm">
                            <Check className="w-5 h-5" />
                          </div>
                        ) : (
                          <span className="font-bold text-stone-900">{feature.us}</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-stone-50">
                  <td className="p-6"></td>
                  <td className="p-6 text-center border-l border-stone-100">
                     <span className="text-sm text-stone-400">$25+ / book</span>
                  </td>
                  <td className="p-6 text-center border-l border-amber-100 bg-amber-50/30">
                    <div className="flex flex-col items-center">
                      <span className="text-lg font-bold text-stone-900">$0.50 / story</span>
                      <span className="text-xs text-amber-600 font-medium">Included in plan</span>
                    </div>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
