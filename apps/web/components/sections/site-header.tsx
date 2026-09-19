"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, Menu, ShoppingBag, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navLinks } from "@/lib/data";
import { cn } from "@/lib/utils";

const currencies = ["USD", "EUR", "GBP", "AUD"];

export function AnnouncementBar() {
  return (
    <div className="bg-violet-deep px-4 py-2 text-center text-[13px] font-semibold tracking-wide text-white">
      Save 20% on 2+ books using code{" "}
      <span className="rounded-md bg-white/15 px-1.5 py-0.5">EXTRA20</span>
    </div>
  );
}

export function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 w-full bg-white/90 backdrop-blur-md transition-shadow",
        scrolled && "shadow-[0_6px_24px_-12px_rgba(31,22,54,.35)]",
      )}
    >
      <div className="shell flex h-[72px] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2" aria-label="WonderWraps home">
          <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="size-5" aria-hidden />
          </span>
          <span className="font-display text-xl font-semibold text-violet-deep">
            WonderWraps
          </span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="rounded-full px-4 py-2 text-[15px] font-semibold text-foreground/80 transition-colors hover:bg-muted hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="hidden gap-1.5 rounded-full font-semibold sm:inline-flex"
              >
                <span
                  aria-hidden
                  className="h-3.5 w-5 rounded-[3px] bg-[linear-gradient(180deg,#b22234_0_33%,#fff_33%_66%,#3c3b6e_66%)]"
                />
                {currency}
                <ChevronDown className="size-3.5" aria-hidden />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {currencies.map((c) => (
                <DropdownMenuItem key={c} onSelect={() => setCurrency(c)}>
                  {c}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <Button asChild size="sm" className="hidden rounded-full px-5 font-bold sm:inline-flex">
            <Link href="/books">
              <ShoppingBag className="size-4" aria-hidden />
              Shop books
            </Link>
          </Button>

          <Button
            asChild
            variant="outline"
            size="icon"
            className="hidden rounded-full sm:inline-flex"
          >
            <Link href="/login" aria-label="Sign in">
              <User className="size-4" aria-hidden />
            </Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full lg:hidden">
                <Menu className="size-5" aria-hidden />
                <span className="sr-only">Open menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="font-display text-violet-deep">
                  WonderWraps
                </SheetTitle>
              </SheetHeader>
              <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
                    href={link.href}
                    className="rounded-xl px-3 py-3 text-base font-semibold hover:bg-muted"
                  >
                    {link.label}
                  </Link>
                ))}
                <Button asChild className="mt-4 rounded-full font-bold">
                  <Link href="/personalise">Try for free</Link>
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}