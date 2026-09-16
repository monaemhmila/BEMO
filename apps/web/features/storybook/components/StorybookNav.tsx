import Link from "next/link";
import { BookOpenCheck } from "lucide-react";

const LINKS = [
  { href: "/storybook/create", label: "Create story" },
  { href: "/storybook/dashboard", label: "My stories" },
  { href: "/storybook/templates", label: "Templates" },
];

export function StorybookNav() {
  return (
    <div className="border-b border-amber-100 bg-white/70 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-5 text-stone-700">
        <div className="flex items-center gap-3">
          <div className="rounded-2xl bg-amber-500/20 p-2 text-amber-600">
            <BookOpenCheck className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-stone-400">
              Storybook Studio
            </p>
            <p className="text-lg font-semibold text-stone-900">
              Create magical adventures
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-full border border-stone-200 px-4 py-2 text-sm font-medium text-stone-700 transition-all hover:border-amber-300 hover:text-amber-600"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

