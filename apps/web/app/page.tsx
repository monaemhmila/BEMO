import dynamic from "next/dynamic";

import { Hero } from "@/components/home/Hero";

// The hero renders immediately; everything below the fold is split into its own
// client chunk so the landing page ships and hydrates less JavaScript first.
const StoryGallery = dynamic(() =>
  import("@/components/home/StoryGallery").then((m) => m.StoryGallery)
);
const Process = dynamic(() =>
  import("@/components/home/Process").then((m) => m.Process)
);
const Benefits = dynamic(() =>
  import("@/components/home/Benefits").then((m) => m.Benefits)
);
const FeaturesSection = dynamic(() =>
  import("@/components/home/FeaturesSection").then((m) => m.FeaturesSection)
);
const MagicEngine = dynamic(() =>
  import("@/components/home/MagicEngine").then((m) => m.MagicEngine)
);
const FAQ = dynamic(() => import("@/components/home/FAQ").then((m) => m.FAQ));

export default function Home() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Hero />
      <StoryGallery />
      <div id="process">
        <Process />
      </div>
      <div id="benefits">
        <Benefits />
      </div>
      <div id="features">
        <FeaturesSection />
      </div>
      <div id="magic">
        <MagicEngine />
      </div>
      <div id="faq">
        <FAQ />
      </div>
    </div>
  );
}
