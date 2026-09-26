"use client";

import * as React from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";

interface BookMobileCtaProps {
  href: string;
  targetId: string;
  priceFrom: string;
  price: string;
}

export function BookMobileCta({ href, targetId, priceFrom, price }: BookMobileCtaProps) {
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry) return;
        setVisible(!entry.isIntersecting && entry.boundingClientRect.bottom < 0);
      },
      { threshold: 0 },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  if (!visible) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-[49] border-t border-border bg-white/85 px-6 py-4 backdrop-blur-md md:block lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <p className="flex flex-col leading-tight">
          <span className="text-[13px] text-muted-foreground">{priceFrom}</span>
          <span className="text-xl font-bold text-primary">{price}</span>
        </p>

        <Link
          href={href}
          className="inline-flex h-16 flex-1 items-center justify-center gap-2 rounded-full bg-primary px-6 text-lg font-bold text-white shadow-md shadow-primary/25 transition-colors hover:bg-violet-deep"
        >
          <Sparkles aria-hidden className="size-5" />
          Personalise my book
        </Link>
      </div>
    </div>
  );
}
