import type { Metadata } from "next";
import { StatsDashboard } from "./stats-dashboard";
import { SiteFooter } from "@/components/sections/site-footer";

export const metadata: Metadata = {
  title: "Site Statistics",
  description:
    "Live views, clicks and page popularity across Mon Petit Hero. See which personalised storybooks people are reading the most.",
};

export default function StatsPage() {
  return (
    <>
      <section className="bg-gradient-to-br from-paper to-blush">
        <div className="shell py-14">
          <p className="text-sm font-semibold uppercase tracking-widest text-primary">
            Mon Petit Hero
          </p>
          <h1 className="font-display mt-3 max-w-2xl text-4xl font-bold text-violet-deep sm:text-5xl">
            Site Statistics
          </h1>
          <p className="mt-4 max-w-xl text-stone-600">
            How many times each page is visited and clicked over the last 30
            days — so you know exactly which books and features families love
            the most.
          </p>
        </div>
      </section>
      <StatsDashboard />
      <SiteFooter />
    </>
  );
}