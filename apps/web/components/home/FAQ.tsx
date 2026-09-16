"use client";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is my child's photo safe?",
    answer: "Yes, absolutely. We use your child's photos ONLY to train a temporary AI model for your stories. The source photos are deleted from our servers within 24 hours.",
  },
  {
    question: "How long does it take to make a story?",
    answer: "It takes about 2-3 minutes to generate a complete story with 8-12 illustrated pages.",
  },
  {
    question: "Can I print the stories?",
    answer: "Yes! You can download a high-resolution PDF suitable for printing, or order a hardcover book directly from us.",
  },
  {
    question: "What ages is this for?",
    answer: "Tales.ai is perfect for children aged 0-10. You can adjust the complexity of the story text to match your child's reading level.",
  },
  {
    question: "Can I try it for free?",
    answer: "Yes, we offer a free trial that lets you generate one complete story so you can see the magic yourself.",
  },
];

export function FAQ() {
  return (
    <section className="py-24 bg-stone-50">
      <div className="container mx-auto px-4 max-w-3xl">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold tracking-tight text-stone-900 mb-2 font-serif">
            Have Questions?
          </h2>
        </div>

        <Accordion type="single" collapsible className="w-full space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem
              key={index}
              value={`item-${index}`}
              className="bg-white border border-stone-200 rounded-lg px-6"
            >
              <AccordionTrigger className="text-left font-medium text-stone-900 hover:text-stone-700 hover:no-underline py-6">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-stone-600 pb-6 leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
