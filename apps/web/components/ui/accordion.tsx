"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

// Custom accordion implementation (no radix dependency installed).

const AccordionContext = React.createContext<{
  expanded: string | undefined;
  setExpanded: (value: string | undefined) => void;
  single: boolean;
  collapsible: boolean;
}>({ expanded: undefined, setExpanded: () => {}, single: true, collapsible: true });

const AccordionItemContext = React.createContext<{ value: string }>({ value: "" });

const Accordion = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & {
    type?: "single";
    collapsible?: boolean;
    defaultValue?: string;
  }
>(({ className, type, collapsible, defaultValue, children }, ref) => {
  const [expanded, setExpanded] = React.useState<string | undefined>(
    defaultValue
  );
  const single = type === "single";
  const collapsibleMode = collapsible ?? true;

  return (
    <AccordionContext.Provider
      value={{ expanded, setExpanded, single, collapsible: collapsibleMode }}
    >
      <div ref={ref} className={cn(className)}>
        {children}
      </div>
    </AccordionContext.Provider>
  );
});
Accordion.displayName = "Accordion";

const AccordionItem = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string }
>(({ className, value, children, ...props }, ref) => (
  <AccordionItemContext.Provider value={{ value }}>
    <div ref={ref} className={cn("border-b", className)} data-value={value} {...props}>
      {children}
    </div>
  </AccordionItemContext.Provider>
));
AccordionItem.displayName = "AccordionItem";

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement>
>(({ className, children, ...props }, ref) => {
  const { expanded, setExpanded, collapsible } = React.useContext(AccordionContext);
  const { value } = React.useContext(AccordionItemContext);
  const isOpen = expanded === value;

  return (
    <h3 className="flex">
      <button
        ref={ref}
        onClick={() => {
          if (isOpen && !collapsible) return;
          setExpanded(isOpen ? undefined : value);
        }}
        className={cn(
          "flex flex-1 items-center justify-between py-4 font-medium transition-all cursor-pointer",
          className
        )}
        data-state={isOpen ? "open" : "closed"}
        aria-expanded={isOpen}
        {...props}
        type="button"
      >
        {children}
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>
    </h3>
  );
});
AccordionTrigger.displayName = "AccordionTrigger";

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, children, ...props }, ref) => {
  const { expanded } = React.useContext(AccordionContext);
  const { value } = React.useContext(AccordionItemContext);
  const isOpen = expanded === value;

  if (!isOpen) return null;

  return (
    <div
      ref={ref}
      className={cn("overflow-hidden text-sm transition-all animate-accordion-down", className)}
      {...props}
    >
      <div className="pb-4 pt-0">{children}</div>
    </div>
  );
});
AccordionContent.displayName = "AccordionContent";

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent };