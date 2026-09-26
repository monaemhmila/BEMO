"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

/**
 * Dashboard page - redirects to Storybook Dashboard
 * We consolidate all dashboard functionality to /storybook/dashboard
 * for a consistent, polished experience
 */
export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/storybook/dashboard");
  }, [router]);

  return (
    <div className="min-h-screen bg-paper flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Redirecting to My Books...</p>
      </div>
    </div>
  );
}
