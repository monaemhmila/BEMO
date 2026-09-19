import type { ReactNode } from "react";

import { StorybookNav } from "@/features/storybook";

export default function StorybookLayout({ children }: { children: ReactNode }) {
  // The Appbar is provided once by the root layout — rendering it here again
  // caused a duplicated navbar and extra client work on every navigation.
  return (
    <div className="min-h-screen bg-paper">
      <div className="pt-[7rem]">
        <StorybookNav />
        <main className="mx-auto max-w-6xl px-4 py-10 md:px-6">{children}</main>
      </div>
    </div>
  );
}