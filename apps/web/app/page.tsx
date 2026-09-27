import { Hero } from "@/components/sections/hero";
import { StoryRail } from "@/components/sections/story-rail";
import { HowItWorks } from "@/components/sections/how-it-works";
import { BeforeAfter } from "@/components/sections/before-after";
import { CharacterShowcase } from "@/components/sections/character-showcase";
import { CareerDreams } from "@/components/sections/career-dreams";
import { BrowseByAge } from "@/components/sections/browse-by-age";
import { CustomStoryBanner } from "@/components/sections/custom-story-banner";
import { Faq } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";
import { SiteFooter } from "@/components/sections/site-footer";
import {
  bestsellerTemplates,
  newReleaseTemplates,
  templatesForAudience,
  type StoryTemplate,
} from "@/data/story-templates";

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

export default function HomePage() {
  const nextShelf = createShelfPicker();
  const bestsellers = nextShelf(bestsellerTemplates());
  const newReleases = nextShelf(newReleaseTemplates());
  const forGirls = nextShelf(templatesForAudience("girl"));
  const forBoys = nextShelf(templatesForAudience("boy"));

  return (
    // The app bar is fixed, so the storefront sits below it.
    <div className="pt-[7rem]">
      <Hero />

      {bestsellers && (
        <StoryRail
          eyebrow="Bestsellers"
          title="Personalise a bestseller"
          templates={bestsellers}
        />
      )}

      {newReleases && (
        <StoryRail
          eyebrow="New releases"
          title="Discover what's new"
          templates={newReleases}
          className="bg-paper"
        />
      )}

      <HowItWorks />

      <BeforeAfter />

      {forGirls && (
        <StoryRail
          eyebrow="Our books"
          title="Books for your little girl!"
          templates={forGirls}
        />
      )}

      <CharacterShowcase />

      {forBoys && (
        <StoryRail
          eyebrow="Our books"
          title="Books for your little boy!"
          templates={forBoys}
          className="bg-paper"
        />
      )}

      <CareerDreams />
      <BrowseByAge />
      <CustomStoryBanner />
      <Faq />
      <FinalCta />

      <SiteFooter />
    </div>
  );
}