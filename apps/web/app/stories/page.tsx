"use client";

import { Appbar } from "@/components/Appbar";
import { StoryLibrary } from "@/features/storybook";

export default function StoriesLibraryPage() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Appbar />
      <main className="pt-24 pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <StoryLibrary />
        </div>
      </main>
    </div>
  );
}
