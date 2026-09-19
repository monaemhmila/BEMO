import Link from "next/link";
import { BookOpenCheck } from "lucide-react";

const LINKS = [
  { href: "/storybook/create", label: "Create story" },
  { href: "/storybook/dashboard", label: "My stories" },
  { href: "/storybook/templates", label: "Templates" },
];

export function StorybookNav() {
  return (
    <div className="border-b border-buttercup/30 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5 text-foreground/80">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-primary/25 p-2 text-primary">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
              Storybook Studio
            </p>
            <p className="text-lg font-semibold text-violet-deep">
              Create magical adventures
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-border px-4 py-2 text-sm font-medium text-foreground/80 transition-all hover:border-buttercup hover:text-primary"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

