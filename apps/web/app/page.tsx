import { AnnouncementBar, SiteHeader } from "@/components/sections/site-header";
import { Hero } from "@/components/sections/hero";
import { BookRail } from "@/components/sections/book-rail";
import { HowItWorks } from "@/components/sections/how-it-works";
import { BeforeAfter } from "@/components/sections/before-after";
import { CharacterShowcase } from "@/components/sections/character-showcase";
import { CareerDreams } from "@/components/sections/career-dreams";
import { BrowseByAge } from "@/components/sections/browse-by-age";
import { Faq } from "@/components/sections/faq";
import { FinalCta } from "@/components/sections/final-cta";
import { SiteFooter } from "@/components/sections/site-footer";
import { bestsellers, boysBooks, girlsBooks, newReleases } from "@/lib/data";

export default function HomePage() {
  return (
    <>
      <AnnouncementBar />
      <SiteHeader />

      <Hero />

      <BookRail
        eyebrow="Bestsellers"
        title="Personalise a bestseller"
        books={bestsellers}
      />

      <BookRail
        eyebrow="New releases"
        title="Discover what's new"
        books={newReleases}
        className="bg-paper"
      />

      <HowItWorks />

      <BeforeAfter />

      <BookRail
        eyebrow="Our books"
        title="Books for your little girl!"
        books={girlsBooks}
      />

      <CharacterShowcase />

      <BookRail
        eyebrow="Our books"
        title="Books for your little boy!"
        books={boysBooks}
        className="bg-paper"
      />

      <CareerDreams />
      <BrowseByAge />
      <Faq />
      <FinalCta />

      <SiteFooter />
    </>
  );
}