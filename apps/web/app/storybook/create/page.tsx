import { Suspense } from "react";

import { CreateChooser } from "./create-chooser";
import { getStoreTemplates } from "@/lib/story-templates";

export const revalidate = 60;

const LOADER = (
  <div className="flex items-center justify-center py-24">
    <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
  </div>
);

/**
 * The wizard and its cover art both come from the database, so this page reads
 * the catalogue and hands the client component only what it needs to render.
 * `?templateId=` is resolved here because the wizard is a client component and
 * cannot query the backend for the picked book itself.
 */
export default async function StorybookCreatePage({
  searchParams,
}: {
  searchParams: Promise<{ templateId?: string }>;
}) {
  const [{ templateId }, templates] = await Promise.all([
    searchParams,
    getStoreTemplates(),
  ]);

  const shelfTemplate = templateId
    ? templates.find((template) => template.slug === templateId) ?? null
    : null;

  const covers = templates
    .filter((template) => template.coverImage)
    .slice(0, 3)
    .map(({ slug, coverImage, title }) => ({ slug, coverImage, title }));

  return (
    <Suspense fallback={LOADER}>
      <CreateChooser covers={covers} shelfTemplate={shelfTemplate} />
    </Suspense>
  );
}
