import Link from "next/link";
import { BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-buttercup/20 text-primary">
          <BookOpen className="h-8 w-8" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold text-violet-deep">
          This page turned into a blank book
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We couldn&apos;t find what you were looking for.
        </p>
        <Button asChild className="mt-6 rounded-full px-7">
          <Link href="/">Back home</Link>
        </Button>
      </div>
    </div>
  );
}