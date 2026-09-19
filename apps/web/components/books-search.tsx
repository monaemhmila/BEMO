"use client";

import * as React from "react";
import { Cake, ChevronDown, Search, Tags, UserRound, X } from "lucide-react";

import { BookCard } from "@/components/book-card";
import { cn } from "@/lib/utils";
import { type SearchBook } from "@/lib/data";

const GENDER_OPTIONS = [
  { value: "boy", label: "Boy" },
  { value: "girl", label: "Girl" },
];

const AGE_OPTIONS = [
  { value: "2-4", label: "2-4" },
  { value: "4-6", label: "4-6" },
  { value: "6-8", label: "6-8" },
  { value: "8+", label: "8+" },
];

const CATEGORY_OPTIONS = [
  { value: "Dream", label: "Dream" },
  { value: "Job", label: "Job" },
  { value: "Adventure", label: "Adventure" },
  { value: "Bedtime story", label: "Bedtime story" },
  { value: "Emotional", label: "Emotional" },
  { value: "Educative", label: "Educative" },
];

type FilterOption = { value: string; label: string };

interface FilterDropdownProps {
  placeholder: string;
  icon: React.ReactNode;
  options: FilterOption[];
  selected: string[];
  onToggle: (value: string) => void;
  searchable?: boolean;
}

function FilterDropdown({
  placeholder,
  icon,
  options,
  selected,
  onToggle,
  searchable,
}: FilterDropdownProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent | TouchEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("touchstart", onPointerDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("touchstart", onPointerDown);
    };
  }, [open]);

  const filtered = searchable
    ? options.filter((option) =>
        option.label.toLowerCase().includes(query.toLowerCase()),
      )
    : options;

  const selectedLabels = selected
    .map((value) => options.find((option) => option.value === value)?.label ?? value)
    .filter(Boolean);

  const display = selected.length
    ? selectedLabels[0] + (selected.length > 1 ? ` +${selected.length - 1}` : "")
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
          {searchable && (
            <div className="border-b border-gray-100 p-1.5">
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search..."
                className="w-full rounded-md border border-gray-200 px-2 py-1 text-xs focus:border-purple-400 focus:ring-1 focus:ring-purple-100 focus:outline-none"
              />
            </div>
          )}
          <ul className="max-h-40 overflow-auto">
            {filtered.length === 0 && (
              <li className="px-2 py-1.5 text-xs text-gray-400">
                No results found
              </li>
            )}
            {filtered.map((option) => (
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

export function BooksSearch({ books }: { books: SearchBook[] }) {
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

  const filtered = books.filter((book) => {
    const query = search.trim().toLowerCase();
    const matchesSearch =
      !query ||
      book.title.toLowerCase().includes(query) ||
      book.tagline.toLowerCase().includes(query);
    if (!matchesSearch) return false;

    if (
      genders.length > 0 &&
      !genders.includes(book.gender) &&
      book.gender !== "any"
    ) {
      return false;
    }

    if (ages.length > 0 && !book.ages.some((age) => ages.includes(age))) {
      return false;
    }

    if (
      categories.length > 0 &&
      !book.categories.some((category) => categories.includes(category))
    ) {
      return false;
    }

    return true;
  });

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

          <div className="flex-1 md:w-40">
            <FilterDropdown
              placeholder="Category"
              icon={<Tags aria-hidden className="h-4 w-4" />}
              options={CATEGORY_OPTIONS}
              selected={categories}
              onToggle={(value) => toggle(setCategories, value)}
            />
          </div>

          <div className="hidden w-16 md:block">
            <button
              type="button"
              onClick={clearAll}
              className="inline-flex h-8 items-center justify-center rounded border border-transparent bg-gradient-to-r from-violet-700/20 to-purple-600/20 px-2 py-1.5 font-medium text-violet-700 transition-colors hover:bg-purple-600/10"
            >
              Clear
            </button>
          </div>

          <div className="md:hidden">
            <button
              type="button"
              onClick={clearAll}
              aria-label="Clear filters"
              className="flex h-6 w-6 flex-shrink-0 items-center justify-center text-red-500 transition-colors hover:text-red-700"
            >
              <X aria-hidden className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="py-20 text-center text-[15px] text-muted-foreground">
          No books match your filters. Try clearing a few.
        </p>
      ) : (
        <div className="mt-10 grid grid-cols-2 gap-x-4 gap-y-8 sm:gap-x-6 lg:grid-cols-3 xl:grid-cols-4">
          {filtered.map((book) => (
            <BookCard key={book.slug} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}