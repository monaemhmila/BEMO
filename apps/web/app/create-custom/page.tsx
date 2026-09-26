import { redirect } from "next/navigation";

// The old free-style page is now part of the single storybook flow: "Create your
// own book" turns the idea into a custom template and generates from it.
export default function CreateCustomStoryPage() {
  redirect("/storybook/create?custom=1");
}