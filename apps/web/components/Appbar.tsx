"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { SignInButton, SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";

const NAV_ITEMS = [
  { label: "Why Tales.ai?", href: "/#benefits" },
  { label: "How It Works", href: "/#process" },
  { label: "Examples", href: "/#features" },
  { label: "FAQs", href: "/#faq" },
];

const AUTH_ITEMS = [
  { label: "Dashboard", href: "/storybook/dashboard" },
  { label: "Library", href: "/stories" },
  { label: "Create Story", href: "/storybook/create" },
];

export function Appbar() {
  const [menuState, setMenuState] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const { user } = useUser();
  const pathname = usePathname();

  const isAdmin = user?.primaryEmailAddress?.emailAddress?.toLowerCase() === "monemehamila@gmail.com";

  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const currentAuthItems = isAdmin
    ? [...AUTH_ITEMS, { label: "Admin ⚡", href: "/admin" }]
    : AUTH_ITEMS;

  // Immersive routes draw their own chrome: /admin (full-screen dashboard) and
  // /stories/<id> (full-screen book reader). Keeping the marketing bar off them
  // avoids it overlapping their toolbars.
  const segments = (pathname ?? "").split("/").filter(Boolean);
  const isReader = segments[0] === "stories" && segments.length === 2 && segments[1] !== "new";
  const isImmersive = pathname === "/admin" || !!pathname?.startsWith("/admin/") || isReader;

  if (isImmersive) {
    return null;
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-300">
      <nav
        className={cn(
          "w-full px-6 py-4 transition-all duration-300",
          isScrolled ? "bg-white/90 backdrop-blur-md border-b border-stone-100 py-3" : "bg-transparent"
        )}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-500 to-orange-600 rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/20 group-hover:rotate-6 transition-transform duration-300">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <span className="font-serif font-bold text-2xl text-stone-900 tracking-tight">
                  Tales<span className="text-amber-600">.ai</span>
                </span>
            </Link>

            {/* Desktop Nav */}
            <div className="hidden lg:flex items-center gap-8">
              <ul className="flex gap-8 text-sm font-medium text-stone-600">
                <SignedOut>
                  {NAV_ITEMS.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className="hover:text-stone-900 transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </SignedOut>
                <SignedIn>
                  {currentAuthItems.map((item, index) => (
                    <li key={index}>
                      <Link
                        href={item.href}
                        className="hover:text-stone-900 transition-colors"
                      >
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </SignedIn>
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-4">
                <div className="hidden md:flex items-center gap-4">
                    <SignedIn>
                        <UserButton afterSignOutUrl="/" />
                    </SignedIn>
                    <SignedOut>
                         <Button variant="ghost" size="sm" className="text-stone-600 hover:text-stone-900">
                            <SignInButton mode="modal">Log in</SignInButton>
                         </Button>
                         <Button size="sm" className="bg-stone-900 text-white hover:bg-stone-800 rounded-full px-5 shadow-lg shadow-stone-900/20">
                            <SignInButton mode="modal">Start Creating</SignInButton>
                         </Button>
                    </SignedOut>
                </div>

                {/* Mobile Menu Toggle */}
                <button
                    className="lg:hidden p-2 text-stone-600"
                    onClick={() => setMenuState(!menuState)}
                >
                    {menuState ? <X /> : <Menu />}
                </button>
            </div>
        </div>

        {/* Mobile Menu */}
        {menuState && (
            <div className="absolute top-full left-0 w-full bg-white border-b border-stone-100 shadow-lg lg:hidden p-6 flex flex-col gap-4 animate-in slide-in-from-top-5">
                 <ul className="flex flex-col gap-4 text-base font-medium text-stone-600">
                    <SignedOut>
                      {NAV_ITEMS.map((item, index) => (
                        <li key={index}>
                          <Link
                            href={item.href}
                            className="block py-2 hover:text-stone-900"
                            onClick={() => setMenuState(false)}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </SignedOut>
                    <SignedIn>
                      {currentAuthItems.map((item, index) => (
                        <li key={index}>
                          <Link
                            href={item.href}
                            className="block py-2 hover:text-stone-900"
                            onClick={() => setMenuState(false)}
                          >
                            {item.label}
                          </Link>
                        </li>
                      ))}
                    </SignedIn>
                  </ul>
                  <div className="h-px bg-stone-100 my-2" />
                  <div className="flex flex-col gap-3">
                        <SignedOut>
                          <Button className="bg-stone-900 text-white w-full justify-center">
                              <SignInButton mode="modal">Start Creating</SignInButton>
                          </Button>
                        </SignedOut>
                        <SignedIn>
                          <Button asChild className="bg-stone-900 text-white w-full justify-center">
                              <Link href="/dashboard">Go to Dashboard</Link>
                          </Button>
                        </SignedIn>
                  </div>
            </div>
        )}
      </nav>
    </header>
  );
}
