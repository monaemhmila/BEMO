"use client";

import { useCredits } from "@/hooks/use-credits";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Loader2, Coins } from "lucide-react";

export function CreditsBadge() {
  const { credits, loading } = useCredits();

  return (
    <div className="bg-white border border-stone-100 rounded-2xl px-6 py-4 flex items-center justify-between shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-700 flex items-center justify-center">
          <Coins className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-stone-400">Credits</p>
          <p className="text-2xl font-serif text-stone-900">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : credits}
          </p>
        </div>
      </div>
      <Link href="/pricing">
        <Button variant="outline" size="sm" className="rounded-full">
          Add more
        </Button>
      </Link>
    </div>
  );
}

