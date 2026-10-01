import { Hero } from "@/components/sections/hero";
import { StoryRail } from "@/components/sections/story-rail";
import { HowItWorks } from "@/components/sections/how-it-works";
import { BeforeAfter } from "@/components/sections/before-after";
import { CustomStoryBanner } from "@/components/sections/custom-story-banner";
import { Faq } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";
import { SiteFooter } from "@/components/sections/site-footer";
import {
  bestsellers,
  forAudience,
  newReleases,
  type StoryTemplate,
} from "@/data/story-templates";
import { getStoreTemplates } from "@/lib/story-templates";

// The shelves are read from the database through the backend.
export const revalidate = 60;

/**
 * Hands each shelf only the books an earlier shelf has not already shown, and
 * returns null when there is nothing left. A small catalogue would otherwise
 * repeat the same book under several headings ("Bestsellers", "New releases",
 * "for your little girl", ...) or render an empty carousel.
 */
function createShelfPicker() {
  const seen = new Set<string>();

  return (candidates: StoryTemplate[]): StoryTemplate[] | null => {
    const fresh = candidates.filter((template) => !seen.has(template.slug));
    for (const template of fresh) seen.add(template.slug);
    return fresh.length > 0 ? fresh : null;
  };
}

export default async function HomePage() {
  const templates = await getStoreTemplates();

  const nextShelf = createShelfPicker();
  const bestsellersShelf = nextShelf(bestsellers(templates));
  const newReleasesShelf = nextShelf(newReleases(templates));
  const forGirls = nextShelf(forAudience(templates, "girl"));

  return (
    // The app bar is fixed, so the storefront sits below it.
    <div className="pt-[7rem]">
      <Hero />

      {bestsellersShelf && (
        <StoryRail
          eyebrow="Bestsellers"
          title="Personalise a bestseller"
          templates={bestsellersShelf}
        />
      )}

      {newReleasesShelf && (
        <StoryRail
          eyebrow="New releases"
          title="Discover what's new"
          templates={newReleasesShelf}
          className="bg-paper"
        />
      )}

      <HowItWorks />
      <BeforeAfter />

      {forGirls && (
        <StoryRail
          eyebrow="Our books"
          title="Stories for every little hero"
          templates={forGirls}
          className="bg-paper"
        />
      )}
      <CustomStoryBanner />
      <Faq />
      <FinalCta />

      <SiteFooter />
    </div>
  );
}
