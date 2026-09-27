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
} from "@/data/story-templates";

export default function HomePage() {
  return (
    // The app bar is fixed, so the storefront sits below it.
    <div className="pt-[7rem]">
      <Hero />

      <StoryRail
        eyebrow="Bestsellers"
        title="Personalise a bestseller"
        templates={bestsellerTemplates()}
      />

      <StoryRail
        eyebrow="New releases"
        title="Discover what's new"
        templates={newReleaseTemplates()}
        className="bg-paper"
      />

      <HowItWorks />

      <BeforeAfter />

      <StoryRail
        eyebrow="Our books"
        title="Books for your little girl!"
        templates={templatesForAudience("girl")}
      />

      <CharacterShowcase />

      <StoryRail
        eyebrow="Our books"
        title="Books for your little boy!"
        templates={templatesForAudience("boy")}
        className="bg-paper"
      />

      <CareerDreams />
      <BrowseByAge />
      <CustomStoryBanner />
      <Faq />
      <FinalCta />

      <SiteFooter />
    </div>
  );
}