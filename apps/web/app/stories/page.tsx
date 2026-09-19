"use client";

import { StoryLibrary } from "@/features/storybook";

export default function StoriesLibraryPage() {
  return (
    <div className="min-h-screen bg-paper">
      <main className="pt-[7rem] pb-20 px-4">
        <div className="max-w-6xl mx-auto">
          <StoryLibrary />
        </div>
      </main>
    </div>
  );
}