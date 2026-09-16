"use client";

import Link from "next/link";

export const StorybookNavigation = () => {
  return (
    <nav className="p-5 bg-gray-100 mb-5">
      <h2 className="text-xl font-bold mb-2">Storybook Platform</h2>
      <div className="flex gap-5 mt-2">
        <Link
          href="/storybook/create"
          className="px-5 py-2 bg-blue-500 text-white rounded no-underline"
        >
          Create New Story
        </Link>
        <Link
          href="/storybook/dashboard"
          className="px-5 py-2 bg-green-500 text-white rounded no-underline"
        >
          My Stories
        </Link>
        <Link
          href="/storybook/templates"
          className="px-5 py-2 bg-yellow-400 text-black rounded no-underline"
        >
          Story Templates
        </Link>
      </div>
    </nav>
  );
};

