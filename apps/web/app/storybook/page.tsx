"use client";

import Link from "next/link";
import {
  Sparkles,
  BookOpenText,
  Camera,
  Palette,
  Volume2,
  ArrowRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const FEATURES = [
  {
    icon: Camera,
    title: "Face Consistency",
    description:
      "Your child's face stays consistent throughout every page of the story.",
    color: "text-blue-500",
    bgColor: "bg-blue-50",
  },
  {
    icon: Palette,
    title: "Beautiful Art Styles",
    description:
      "Choose from Disney-inspired, watercolor, claymation, and more.",
    color: "text-purple-500",
    bgColor: "bg-purple-50",
  },
  {
    icon: Volume2,
    title: "Audio Narration",
    description: "Professional voice narration to bring your story to life.",
    color: "text-emerald-500",
    bgColor: "bg-emerald-50",
  },
];

const PROCESS_STEPS = [
  {
    step: 1,
    title: "Train Your Hero",
    description: "Upload 5-10 photos of your child to train the AI model.",
  },
  {
    step: 2,
    title: "Choose the Adventure",
    description: "Pick a theme, story length, and art style.",
  },
  {
    step: 3,
    title: "Watch the Magic",
    description: "AI generates script, illustrations, and narration.",
  },
  {
    step: 4,
    title: "Share & Print",
    description: "Read online, download PDF, or order a printed copy.",
  },
];

export default function StorybookHome() {
  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-buttercup/15 via-blush/50 to-blush/70 p-8 md:p-12">
        <div
          className={`absolute inset-0 bg-[url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23f97316' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")] opacity-50`}
        />
        
        <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-8">
          <div className="max-w-xl">
            <div className="animate-in fade-in">
              <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 rounded-full text-sm font-medium text-violet-deep mb-4">
                <Sparkles className="w-4 h-4" />
                AI-Powered Storybooks
              </span>
              <h1 className="font-display text-4xl md:text-5xl font-bold text-violet-deep leading-tight">
                Turn Family Photos Into
                <span className="text-primary"> Bedtime Adventures</span>
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Upload your child&apos;s photos once and generate illustrated chapters,
                printable PDFs, and narrated audio with a single tap.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-8">
              <Link href="/storybook/create">
                <Button
                  size="lg"
                  className="bg-primary hover:bg-violet-deep text-white rounded-full shadow-xl gap-2 w-full sm:w-auto"
                >
                  <Sparkles className="w-5 h-5" />
                  Create a Story
                </Button>
              </Link>
              <Link href="/books">
                <Button
                  size="lg"
                  variant="outline"
                  className="rounded-full border-border gap-2 w-full sm:w-auto"
                >
                  <BookOpenText className="w-5 h-5" />
                  Browse Books
                </Button>
              </Link>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="relative">
            <div className="w-64 h-80 bg-white rounded-2xl shadow-2xl overflow-hidden rotate-3 transform hover:rotate-0 transition-transform duration-500">
              <div className="h-2/3 bg-gradient-to-br from-buttercup/30 to-blush/70 flex items-center justify-center">
                <span className="text-8xl">📚</span>
              </div>
              <div className="p-4">
                <div className="h-3 bg-muted rounded w-3/4 mb-2" />
                <div className="h-2 bg-muted rounded w-full" />
                <div className="h-2 bg-muted rounded w-2/3 mt-1" />
              </div>
            </div>
            <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-buttercup rounded-full flex items-center justify-center shadow-lg">
              <span className="text-2xl">✨</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="grid gap-6 md:grid-cols-3">
        {FEATURES.map((feature) => (
          <Card key={feature.title} className="p-6 h-full border-border hover:shadow-lg transition-shadow">
            <div className={`w-12 h-12 ${feature.bgColor} rounded-2xl flex items-center justify-center mb-4`}>
              <feature.icon className={`w-6 h-6 ${feature.color}`} />
            </div>
            <h3 className="font-display text-xl font-bold text-violet-deep">
              {feature.title}
            </h3>
            <p className="mt-2 text-muted-foreground">{feature.description}</p>
          </Card>
        ))}
      </section>

      {/* How It Works */}
      <section>
        <div className="text-center mb-10">
          <h2 className="font-display text-3xl font-bold text-violet-deep">
            How It Works
          </h2>
          <p className="mt-2 text-muted-foreground">
            Four simple steps to your personalized storybook
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          {PROCESS_STEPS.map((step, index) => (
            <div key={step.step} className="relative">
              <Card className="p-6 text-center border-border h-full">
                <div className="w-10 h-10 bg-buttercup/100 text-white rounded-full flex items-center justify-center mx-auto mb-4 font-bold">
                  {step.step}
                </div>
                <h3 className="font-display text-lg font-bold text-violet-deep">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>
              </Card>
              
              {index < PROCESS_STEPS.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -right-2 transform -translate-y-1/2 z-10">
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="text-center py-12">
        <Card className="p-8 md:p-12 bg-gradient-to-br from-violet-deep to-violet-ink border-0 text-white">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Ready to Create Magic?
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto mb-8">
            Join thousands of parents creating unforgettable personalized
            storybooks for their children.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/storybook/create">
              <Button
                size="lg"
                className="bg-buttercup/100 hover:bg-primary/90 text-violet-deep rounded-full shadow-xl"
              >
                <Sparkles className="w-5 h-5 mr-2" />
                Start Creating Now
              </Button>
            </Link>
            <Link href="/storybook/dashboard">
              <Button
                size="lg"
                variant="outline"
                className="rounded-full border-white/40 text-white hover:bg-violet-deep"
              >
                <BookOpenText className="w-5 h-5 mr-2" />
                My stories
              </Button>
            </Link>
          </div>
        </Card>
      </section>
    </div>
  );
}
