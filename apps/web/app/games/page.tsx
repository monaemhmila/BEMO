import type { Metadata } from "next";

import { GameHub } from "@/features/games/components/GameHub";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Free Kids Games | Math, Colors & Storybook Fun",
  description:
    "Play free, kid-friendly games from Mon Petit Hero: Hero Snake, Storybook 2048, a fun math quiz, and an animated color-mixing challenge.",
  keywords: [
    "free kids games",
    "math games for kids",
    "color mixing game",
    "educational games for children",
    "storybook games",
  ],
  alternates: { canonical: `${SITE_URL}/games` },
  openGraph: {
    title: "Free Storybook Games for Kids | Mon Petit Hero",
    description: "Play, learn, and explore with colorful games inspired by the Mon Petit Hero storybook world.",
    url: `${SITE_URL}/games`,
    type: "website",
  },
};

const gameSchema = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Mon Petit Hero Kids Games",
  description: metadata.description,
  url: `${SITE_URL}/games`,
  isPartOf: { "@type": "WebSite", name: "Mon Petit Hero", url: SITE_URL },
  hasPart: [
    "Hero Snake",
    "Storybook 2048",
    "Magic Math Quiz",
    "Color Lab",
  ].map((name) => ({ "@type": "Game", name, isAccessibleForFree: true })),
};

export default function GamesPage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(gameSchema) }} />
      <GameHub />
    </>
  );
}
