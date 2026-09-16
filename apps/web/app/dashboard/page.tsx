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
    <div className="min-h-screen bg-[#faf9f6] flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500 mx-auto mb-4" />
        <p className="text-stone-500">Redirecting to your dashboard...</p>
      </div>
    </div>
  );
}
