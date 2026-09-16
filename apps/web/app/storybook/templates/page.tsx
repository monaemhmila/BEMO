import Link from "next/link";
import { BookMarked, Heart, GraduationCap } from "lucide-react";

import { BACKEND_URL } from "../../config";

// This page reads templates from the backend on every request,
// so it must never be statically prerendered at build time.
export const dynamic = "force-dynamic";

interface StoryTemplate {
  id: string;
  name: string;
  ageRange: string;
  category: string;
  description?: string;
  moralLesson?: string;
  educationalFocus?: string;
}

async function fetchTemplates(): Promise<StoryTemplate[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/storybook/templates`, {
      cache: "no-store",
    });
    if (!res.ok) {
      throw new Error("Failed to fetch templates");
    }
    const data = await res.json();
    return data.templates ?? [];
  } catch (error) {
    console.error("Unable to fetch templates", error);
    return [];
  }
}

export default async function StorybookTemplatesPage() {
  const templates = await fetchTemplates();

  return (
    <div className="space-y-6">
      <header>
        <p className="text-sm uppercase tracking-[0.3em] text-amber-500 font-medium">Educational & Moral Templates</p>
        <h1 className="font-serif text-4xl font-bold text-stone-900">Pick a story starter with value</h1>
        <p className="mt-2 max-w-2xl text-stone-500">
          Curated creative briefs embedded with meaningful moral lessons and educational takeaways for every child.
        </p>
      </header>

      {templates.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-stone-200 bg-white p-10 text-center text-stone-500">
          Templates have not been added yet. You can still{" "}
          <Link href="/storybook/create" className="text-amber-600 underline underline-offset-4">
            start a story from scratch
          </Link>
          .
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {templates.map((template) => (
            <div key={template.id} className="flex flex-col justify-between rounded-3xl border border-stone-100 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <span className="inline-block rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-amber-600">
                      {template.category}
                    </span>
                    <h3 className="mt-2 text-2xl font-semibold text-stone-900">{template.name}</h3>
                  </div>
                  <BookMarked className="h-6 w-6 text-amber-500 flex-shrink-0" />
                </div>

                <p className="mt-3 text-sm text-stone-600">{template.description ?? "Bring this template to life with your child’s photos."}</p>

                <div className="mt-4 space-y-2 border-t border-stone-100 pt-3 text-xs">
                  {template.moralLesson && (
                    <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl">
                      <Heart className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                      <span><strong>Moral Value:</strong> {template.moralLesson}</span>
                    </div>
                  )}
                  {template.educationalFocus && (
                    <div className="flex items-center gap-2 text-blue-700 bg-blue-50 px-3 py-1.5 rounded-xl">
                      <GraduationCap className="w-4 h-4 text-blue-600 flex-shrink-0" />
                      <span><strong>Educational Focus:</strong> {template.educationalFocus}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 flex items-center justify-between pt-4 border-t border-stone-100">
                <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-medium text-stone-600">
                  Ages {template.ageRange}
                </span>

                <Link
                  href={{
                    pathname: "/storybook/create",
                    query: { templateId: template.id },
                  }}
                  className="inline-flex items-center justify-center rounded-full bg-stone-900 px-5 py-2 text-sm font-semibold text-white hover:bg-amber-600 transition-colors"
                >
                  Use template
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

