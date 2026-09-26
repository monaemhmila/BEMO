"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

export interface BookFaqItem {
  question: string;
  answer: string;
}

export function BookFaq({ items }: { items: BookFaqItem[] }) {
  const [openIndex, setOpenIndex] = React.useState<number | null>(0);

  return (
    <div className="flex flex-col">
      {items.map((item, index) => {
        const isOpen = openIndex === index;

        return (
          <div key={item.question} className="border-t border-border">
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full items-center justify-between gap-4 px-1 py-4 text-left"
            >
              <span className="text-[18px] font-semibold text-violet-deep">
                {item.question}
              </span>
              <ChevronDown
                aria-hidden
                className={cn(
                  "size-5 shrink-0 text-muted-foreground transition-transform duration-300",
                  isOpen && "rotate-180",
                )}
              />
            </button>

            <div
              className={cn(
                "grid transition-[grid-template-rows] duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-1 pb-5 pl-7 text-[16px] leading-relaxed text-muted-foreground">
                  {item.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
      <div className="border-t border-border" />
    </div>
  );
}
