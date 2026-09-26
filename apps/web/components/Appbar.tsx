"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, Menu, ShoppingBag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { navLinks } from "@/lib/data";
import { LanguageSelector } from "@/components/language-selector";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const AUTH_ITEMS = [
  { label: "Dashboard", href: "/storybook/dashboard" },
  { label: "Create Story", href: "/storybook/create" },
];

export function Appbar() {
  const [scrolled, setScrolled] = React.useState(false);
  const { user } = useUser();
  const pathname = usePathname();

  const isAdmin =
    user?.primaryEmailAddress?.emailAddress?.toLowerCase() === "monemehamila@gmail.com";

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Immersive routes draw their own chrome: /admin (full-screen control center)
  // and /stories/<id> (full-screen book reader). The homepage is a storefront
  // with its own sticky header (Mon Petit Hero design). Skip the app bar there.
  const segments = (pathname ?? "").split("/").filter(Boolean);
  const isReader = segments[0] === "stories" && segments.length === 2 && segments[1] !== "new";
  const isImmersive = pathname === "/admin" || !!pathname?.startsWith("/admin/") || isReader;
  const isHome = pathname === "/";

  if (isImmersive || isHome) {
    return null;
  }

  const currentAuthItems = isAdmin
    ? [...AUTH_ITEMS, { label: "Admin", href: "/admin" }]
    : AUTH_ITEMS;

  const signedInNav = [
    ...currentAuthItems,
    { label: "Shop Books", href: "/books" },
    { label: "Support", href: "/support" },
  ];

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname?.startsWith(href);

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      {/* Promo strip — matches the homepage announcement bar */}
      <div className="bg-violet-deep px-4 py-2 text-center text-[13px] font-semibold tracking-wide text-white">
        Save 20% on 2+ books using code{" "}
        <span className="rounded-md bg-white/15 px-1.5 py-0.5">EXTRA20</span>
      </div>

      {/* Sticky Mon Petit Hero header */}
      <div
        className={cn(
          "border-b border-border bg-white/90 backdrop-blur-md transition-shadow",
          scrolled && "shadow-[0_6px_24px_-12px_rgba(31,22,54,.35)]",
        )}
      >
        <div className="shell flex h-[72px] items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2" aria-label="Mon Petit Hero home">
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground">
              <BookOpen className="size-5" aria-hidden />
            </span>
            <span className="font-display text-xl font-semibold text-violet-deep">
              Mon Petit Hero
            </span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Main">
            <SignedOut>
              {navLinks.map((link) => (
                <Link
                  key={link.label}
                  href={link.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-[15px] font-semibold transition-colors hover:bg-muted hover:text-primary",
                    isActive(link.href) ? "text-primary" : "text-foreground/80",
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </SignedOut>

            <SignedIn>
              {signedInNav.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className={cn(
                    "rounded-full px-4 py-2 text-[15px] font-semibold transition-colors hover:bg-muted hover:text-primary",
                    item.label === "Create Story"
                      ? "bg-primary px-5 py-2 font-bold text-white hover:bg-violet-deep"
                      : isActive(item.href)
                        ? "text-primary"
                        : "text-foreground/80",
                  )}
                >
                  {item.label}
                </Link>
              ))}
            </SignedIn>
          </nav>

          <div className="flex items-center gap-2">
            <LanguageSelector />

            <Button asChild size="sm" className="hidden rounded-full px-5 font-bold sm:inline-flex">
              <Link href="/books">
                <ShoppingBag className="size-4" aria-hidden />
                Shop books
              </Link>
            </Button>

            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <SignedOut>
              <Button asChild size="sm" variant="outline" className="hidden rounded-full px-5 font-bold sm:inline-flex">
                <Link href="/login">
                  <User className="size-4" aria-hidden />
                  Sign in
                </Link>
              </Button>
              <Button asChild size="sm" className="hidden rounded-full px-5 font-bold sm:inline-flex">
                <Link href="/storybook/create">Start Creating</Link>
              </Button>
            </SignedOut>

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
                    Mon Petit Hero
                  </SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col gap-1 px-4" aria-label="Mobile">
                  <SignedOut>
                    {navLinks.map((link) => (
                      <Link
                        key={link.label}
                        href={link.href}
                        className="rounded-xl px-3 py-3 text-base font-semibold hover:bg-muted"
                      >
                        {link.label}
                      </Link>
                    ))}
                    <div className="mt-4 flex flex-col gap-2">
                      <Button asChild className="rounded-full font-bold">
                        <Link href="/login">Sign In</Link>
                      </Button>
                      <Button asChild className="rounded-full font-bold">
                        <Link href="/storybook/create">Start Creating</Link>
                      </Button>
                    </div>
                  </SignedOut>
                  <SignedIn>
                    {signedInNav.map((item) => (
                      <Link
                        key={item.label}
                        href={item.href}
                        className="rounded-xl px-3 py-3 text-base font-semibold hover:bg-muted"
                      >
                        {item.label}
                      </Link>
                    ))}
                    <Button asChild className="mt-4 rounded-full font-bold">
                      <Link href="/dashboard">Go to Dashboard</Link>
                    </Button>
                  </SignedIn>
                </nav>
                <div className="px-4 pt-4">
                  <LanguageSelector />
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>
    </header>
  );
}