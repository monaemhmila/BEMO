"use client";

import { motion } from "motion/react";
import { Star } from "lucide-react";
import { TestimonialsColumn } from "@/components/ui/testimonials-columns";

const REVIEWS = [
  {
    name: "Sarah J.",
    role: "Mom of 2",
    text: "My son Leo literally gasped when he saw himself as an astronaut. We read 'Leo's Moon Walk' every night now.",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
  },
  {
    name: "Michael T.",
    role: "Dad of 1",
    text: "The watercolor style is beautiful. It looks like a real book you'd buy at a store, but it's 100% personalized.",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Michael"
  },
  {
    name: "Emily R.",
    role: "Gift Giver",
    text: "I made one for my niece's birthday. Her parents cried. Best gift I've ever given for $10.",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Emily"
  },
  {
    name: "Jessica M.",
    role: "Teacher",
    text: "I used this for my class story time. The kids were amazed to see a character that looked like our class pet!",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Jessica"
  },
  {
    name: "David K.",
    role: "Uncle",
    text: "Got this for my nephew who loves dinosaurs. The illustrations are top-notch and the story is actually good!",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=David"
  },
  {
    name: "Olivia P.",
    role: "Mom of 3",
    text: "Finally a way to make all my kids the stars of their own stories. No more fighting over who gets to be the hero.",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Olivia"
  },
  {
    name: "Daniel H.",
    role: "Grandparent",
    text: "A wonderful keepsake. The quality of the printed book is excellent, and the story is very touching.",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Daniel"
  },
  {
    name: "Sophia L.",
    role: "Aunt",
    text: "The best personalized book I've found. The AI really captures the likeness in a cute, illustrated way.",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sophia"
  },
  {
    name: "Ryan G.",
    role: "Dad of 2",
    text: "Super easy to create. I did it on my phone in 5 minutes and the result was magical.",
    image: "https://api.dicebear.com/7.x/avataaars/svg?seed=Ryan"
  }
];

const firstColumn = REVIEWS.slice(0, 3);
const secondColumn = REVIEWS.slice(3, 6);
const thirdColumn = REVIEWS.slice(6, 9);

export function TrustedBy() {
  return (
    <section className="py-20 border-y border-stone-100 bg-stone-50/50 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          viewport={{ once: true }}
          className="flex flex-col items-center justify-center max-w-[540px] mx-auto text-center mb-12"
        >
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex -space-x-2">
              {[1, 2, 3, 4].map((i) => (
                <img
                  key={i}
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i * 123}`}
                  alt="User"
                  className="w-8 h-8 rounded-full border-2 border-white bg-stone-100"
                />
              ))}
            </div>
            <div className="flex flex-col items-start">
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Star key={i} className="w-4 h-4 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <span className="text-xs font-medium text-stone-600">from 2,000+ parents</span>
            </div>
          </div>

          <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-bold text-stone-900 tracking-tight">
            Loved by families everywhere
          </h2>
          <p className="text-stone-600 mt-4 text-lg max-w-md mx-auto">
            See why parents choose Portrait AI for their bedtime stories.
          </p>
        </motion.div>

        <div className="flex justify-center gap-6 [mask-image:linear-gradient(to_bottom,transparent,black_20%,black_80%,transparent)] max-h-[600px] overflow-hidden">
          <TestimonialsColumn testimonials={firstColumn} duration={15} />
          <TestimonialsColumn testimonials={secondColumn} className="hidden md:block" duration={19} />
          <TestimonialsColumn testimonials={thirdColumn} className="hidden lg:block" duration={17} />
        </div>
      </div>
    </section>
  );
}
