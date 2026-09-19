"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * App-level error boundary: shows a friendly recovery UI instead of a
 * white screen, and retries the failed segment on demand.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-6">
      <div className="w-full max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-buttercup/20 text-primary">
          <AlertTriangle className="h-8 w-8" />
        </div>
        <h2 className="mt-5 font-display text-2xl font-bold text-violet-deep">
          Something went wrong
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          We hit a snag while loading this page. You can retry, or head back home.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button onClick={reset} className="rounded-full px-6">
            <RefreshCw className="size-4" /> Try again
          </Button>
          <Button asChild variant="outline" className="rounded-full px-6">
            <Link href="/">
              <Home className="size-4" /> Go home
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}