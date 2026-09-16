import { nextJsConfig } from "@repo/eslint-config/next-js";

/** @type {import("eslint").Linter.Config[]} */
export default [
  ...nextJsConfig,
  {
    rules: {
      // Images are delivered via dynamic backend hosts (fal.media/R2), SVG
      // avatars (dicebear) and client-side blob/data previews that Next's
      // image optimizer cannot serve. Raw <img> is the project convention.
      "@next/next/no-img-element": "off",
      // Fully typed TS components; prop-types is redundant.
      "react/prop-types": "off",
    },
  },
  {
    files: ["next-env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
];