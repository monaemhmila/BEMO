"use client";

import * as React from "react";
import { Cake, ChevronDown, Search, UserRound, X } from "lucide-react";

import { CATEGORY_META, type StoryCategory, type StoryTemplate } from "@/data/story-templates";
import { TemplateBookGrid } from "@/components/template-book-grid";
import { cn } from "@/lib/utils";

const GENDER_OPTIONS = [
  { value: "girl", label: "Girl" },
  { value: "boy", label: "Boy" },
];

const AGE_OPTIONS = [
  { value: "2-4", label: "2-4" },
  { value: "4-6", label: "4-6" },
  { value: "6-8", label: "6-8" },
  { value: "8+", label: "8+" },
];

const CATEGORY_OPTIONS: { value: StoryCategory; label: string }[] = [
  { value: "educative", label: CATEGORY_META.educative.label },
  { value: "adventure", label: CATEGORY_META.adventure.label },
  { value: "sentimental", label: CATEGORY_META.sentimental.label },
];

type FilterOption = { value: string; label: string };

interface FilterDropdownProps {
  placeholder: string;
  icon: React.ReactNode;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
}

function FilterDropdown({
  placeholder,
  icon,
  options,
  selected,
  onToggle,
}: FilterDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const selectedLabels = selected
    .map((value) => options.find((option) => option.value === value)?.label ?? value)
    .filter(Boolean);

  const display = selected.length
    ? selectedLabels[0] + (selectedLabels.length > 1 ? ` +${selectedLabels.length - 1}` : "")
    : placeholder;

  return (
    <div ref={rootRef} className="relative w-full">
      {selected.length > 0 && (
        <span className="absolute -top-1 -right-1 z-20 flex h-4 w-4 items-center justify-center rounded-full bg-purple-500 font-medium text-white [font-size:10px]">
          {selected.length}
        </span>
      )}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between rounded-md border border-gray-300 bg-white px-2 py-1.5 text-left shadow-sm transition-colors duration-150 focus:border-purple-400 focus:ring-1 focus:ring-purple-100 focus:outline-none md:py-2"
      >
        <div className="mr-2 flex min-w-0 flex-1 items-center gap-1.5">
          <span className="shrink-0 text-gray-700">{icon}</span>
          <span
            className={cn(
              "truncate text-xs",
              selected.length ? "text-gray-900" : "text-gray-700",
            )}
          >
            {display}
          </span>
        </div>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-3 shrink-0 text-gray-700 transition-transform duration-200",
            open && "rotate-180",
          )}
        />
      </button>

      {open && (
        <div className="absolute z-10 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <ul className="max-h-40 overflow-auto">
            {options.map((option) => (
              <li
                key={option.value}
                onClick={() => onToggle(option.value)}
                className="flex cursor-pointer items-center gap-1.5 px-2 py-1 transition-colors hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  autoComplete="off"
                  checked={selected.includes(option.value)}
                  onClick={(event) => {
                    event.stopPropagation();
                    onToggle(option.value);
                  }}
                  onChange={() => undefined}
                  className="size-3.5 cursor-pointer rounded-sm border-gray-200 text-purple-400 shadow-none transition-colors duration-150 focus:ring-white focus:outline-none"
                />
                <span className="text-xs text-gray-700">{option.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function overlaps(ageRange: string, bucket: string) {
  const [rangeMin = 0, rangeMax = 0] = ageRange.split("-").map((value) => Number(value));
  const [bucketMin = 0, bucketMax = 0] = bucket.split("-").map((value) => Number(value));
  if (Number.isNaN(rangeMin) || Number.isNaN(rangeMax)) return false;
  if (Number.isNaN(bucketMax)) return rangeMax >= bucketMin;
  return rangeMin <= bucketMax && rangeMax >= bucketMin;
}

export function TemplateBookFilters({ templates }: { templates: StoryTemplate[] }) {
  const [search, setSearch] = React.useState("");
  const [genders, setGenders] = React.useState<string[]>([]);
  const [ages, setAges] = React.useState<string[]>([]);
  const [categories, setCategories] = React.useState<string[]>([]);

  const toggle = (
    setter: React.Dispatch<React.SetStateAction<string[]>>,
    value: string,
  ) => {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  };

  const clearAll = () => {
    setSearch("");
    setGenders([]);
    setAges([]);
    setCategories([]);
  };

  const filtered = templates.filter((template) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      template.title.toLowerCase().includes(query) ||
      template.tagline.toLowerCase().includes(query);
    if (!matchesSearch) return false;

    if (
      genders.length > 0 &&
      !genders.includes(template.audience) &&
      template.audience !== "any"
    ) {
      return false;
    }

    if (ages.length > 0 && !ages.some((age) => overlaps(template.ageRange, age))) {
      return false;
    }

    if (categories.length > 0 && !categories.includes(template.category)) {
      return false;
    }

    return true;
  });

  const hasFilters =
    search.trim().length > 0 || genders.length > 0 || ages.length > 0 || categories.length > 0;

  return (
    <div>
      <div className="flex flex-col gap-2 md:max-w-2xl md:flex-row md:items-center md:gap-4 md:px-0">
        <div className="flex-1 md:w-40">
          <div className="relative w-full">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2">
              <Search aria-hidden className="size-4 text-gray-700" />
            </div>
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search books..."
              className="block w-full rounded-md border border-gray-300 bg-white py-1.5 pr-3 pl-8 text-xs text-gray-900 placeholder-gray-700 focus:border-purple-400 focus:ring-1 focus:ring-purple-100 focus:outline-none focus:placeholder-gray-400 md:py-2"
            />
          </div>
        </div>

        <div className="flex flex-row items-center md:gap-4">
          <div className="flex-1 md:w-24">
            <FilterDropdown
              placeholder="Gender"
              icon={<UserRound aria-hidden className="h-4 w-4" />}
              options={GENDER_OPTIONS}
              selected={genders}
              onToggle={(value) => toggle(setGenders, value)}
            />
          </div>

          <div className="mx-2 flex-1 md:mx-0 md:w-32">
            <FilterDropdown
              placeholder="Child Age"
              icon={<Cake aria-hidden className="h-4 w-4" />}
              options={AGE_OPTIONS}
              selected={ages}
              onToggle={(value) => toggle(setAges, value)}
            />
          </div>

          <div className="hidden w-16 md:block">
            <button
              type="button"
              onClick={clearAll}
              disabled={!hasFilters}
              className="inline-flex h-8 items-center justify-center rounded border border-transparent bg-gradient-to-r from-violet-700/20 to-purple-600/20 px-2 py-1.5 font-medium text-violet-700 transition-colors hover:bg-purple-600/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Clear
            </button>
          </div>

          <div className="md:hidden">
            <button
              type="button"
              onClick={clearAll}
              disabled={!hasFilters}
              aria-label="Clear filters"
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-red-500 transition-colors hover:text-red-700 disabled:opacity-40"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Second filter row: story category */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {CATEGORY_OPTIONS.map((option) => {
          const active = categories.includes(option.value);
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={active}
              onClick={() => toggle(setCategories, option.value)}
              className={cn(
                "rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors",
                active
                  ? "border-primary bg-primary text-white"
                  : "border-border bg-white text-muted-foreground hover:border-primary/40 hover:text-primary",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {filtered.length === 0 ? (
        <p className="py-20 text-center text-[15px] text-muted-foreground">
          No books match your filters. Try clearing a few.
        </p>
      ) : (
        <TemplateBookGrid templates={filtered} />
      )}
    </div>
  );
}
