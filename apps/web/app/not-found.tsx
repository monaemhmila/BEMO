import Link from "next/link";
import { BookOpen } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf9f6] p-6">
      <div className="w-full max-w-md rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
          <BookOpen className="h-8 w-8" />
        </div>
        <h2 className="mt-5 font-serif text-2xl font-bold text-stone-900">
          This page turned into a blank book
        </h2>
        <p className="mt-2 text-sm text-stone-500">
          We couldn&apos;t find what you were looking for.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block rounded-xl bg-stone-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-stone-800"
        >
          Back home
        </Link>
      </div>
    </div>
  );
}