"use client";

import { Hero } from "@/components/home/Hero";
import { StoryGallery } from "@/components/home/StoryGallery";
import { Process } from "@/components/home/Process";
import { Benefits } from "@/components/home/Benefits";
import { FeaturesSection } from "@/components/home/FeaturesSection";
import { MagicEngine } from "@/components/home/MagicEngine";
import { FAQ } from "@/components/home/FAQ";

export default function Home() {
  return (
    <div className="min-h-screen bg-[#faf9f6]">
      <Hero />
      <StoryGallery />
      <div id="process"><Process /></div>
      <div id="benefits"><Benefits /></div>
      <div id="features"><FeaturesSection /></div>
      <div id="magic"><MagicEngine /></div>
      <div id="faq"><FAQ /></div>
    </div>
  );
}
