import type { ReactNode } from "react";

import { Appbar } from "@/components/Appbar";
import { StorybookNav } from "@/features/storybook";

export default function StorybookLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf7f2]">
      <Appbar />
      <div className="pt-24">
        <StorybookNav />
        <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">{children}</main>
      </div>
    </div>
  );
}

