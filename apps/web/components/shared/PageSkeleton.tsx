/**
 * Lightweight route-level skeletons used by `loading.tsx` files so navigation
 * paints instantly instead of waiting for the server render.
 */

export function PageSkeleton({
  variant = "light",
  rows = 3,
}: {
  variant?: "light" | "dark";
  rows?: number;
}) {
  const isDark = variant === "dark";
  const block = isDark ? "bg-white/10" : "bg-muted";

  return (
    <div
      className={`w-full animate-pulse ${isDark ? "text-white" : "text-foreground"}`}
      aria-busy="true"
      aria-live="polite"
    >
      <span className="sr-only">Loading…</span>

      {/* Heading */}
      <div className="flex items-center gap-3">
        <div className={`h-9 w-9 rounded-xl ${block}`} />
        <div className="flex-1 space-y-2">
          <div className={`h-5 w-1/3 rounded-md ${block}`} />
          <div className={`h-3 w-1/4 rounded-md ${block}`} />
        </div>
      </div>

      {/* Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className={`overflow-hidden rounded-2xl border ${
              isDark ? "border-white/10 bg-white/5" : "border-border bg-card"
            }`}
          >
            <div className={`aspect-video w-full ${block}`} />
            <div className="space-y-2 p-4">
              <div className={`h-4 w-2/3 rounded-md ${block}`} />
              <div className={`h-3 w-1/2 rounded-md ${block}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function StoryReaderSkeleton() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-violet-deep via-violet-ink to-violet-deep">
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="h-8 w-14 shrink-0 animate-pulse rounded-full bg-white/10 sm:w-24" />
        <div className="h-8 w-full max-w-36 min-w-0 flex-1 animate-pulse rounded-full bg-white/10" />
        <div className="h-8 w-14 shrink-0 animate-pulse rounded-full bg-white/10 sm:w-20" />
      </div>
      <div className="flex flex-1 items-center justify-center px-4 pb-6">
        <div className="flex aspect-[2/1.15] w-full max-w-6xl animate-pulse overflow-hidden rounded-xl bg-paper shadow-2xl">
          <div className="flex-1 border-r border-border/60 bg-paper" />
          <div className="flex-1 bg-paper" />
        </div>
      </div>
      <div className="pb-8 text-center text-white/30 text-xs">Opening your book…</div>
    </div>
  );
}

export default PageSkeleton;