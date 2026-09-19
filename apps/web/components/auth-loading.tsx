import { Loader2 } from "lucide-react";

/**
 * Branded loading state shown while Clerk's SignIn/SignUp component bundle
 * mounts. Matches the auth card wrapper so there is no layout jump.
 */
export function AuthLoading() {
  return (
    <div
      data-auth-page
      className="flex justify-center overflow-hidden rounded-3xl border border-border bg-white p-1 shadow-[0_18px_40px_-22px_rgba(31,22,54,.45)]"
    >
      <div className="flex w-full max-w-md flex-col items-center justify-center gap-4 px-6 py-16">
        <Loader2
          className="size-8 animate-spin text-primary"
          aria-hidden="true"
        />
        <p className="text-sm font-medium text-muted-foreground">
          Loading…
        </p>
      </div>
    </div>
  );
}