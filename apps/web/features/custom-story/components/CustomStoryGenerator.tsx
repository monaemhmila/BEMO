"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import axios, { AxiosError } from "axios";
import {
  Sparkles,
  BookOpen,
  Loader2,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  User,
  Wand2,
  AlertCircle,
  Upload,
  PenLine,
  Languages,
  Rocket,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { handleImageError } from "@/components/ui/image-fallback";

import { useAuth } from "@/hooks/useAuth";
import { trialUpdateEvent } from "@/hooks/use-trials";
import { BACKEND_URL } from "../../../app/config";
import {
  generateCustomStory,
  CUSTOM_STORY_LANGUAGES,
  CUSTOM_STORY_LENGTHS,
  type CustomPreviewPage,
} from "../services/customStory";

const STEPS = [
  { title: "Your Hero", description: "Upload your child's photo", icon: User },
  { title: "Story Brief", description: "Describe your own story", icon: PenLine },
  { title: "Generate", description: "Create your story", icon: Rocket },
];

interface GeneratedCustomStory {
  storyId: string;
  title: string;
  childName: string;
  pages: CustomPreviewPage[];
}

export function CustomStoryGenerator() {
  const router = useRouter();
  const { getToken, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedStory, setGeneratedStory] = useState<GeneratedCustomStory | null>(null);

  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState(5);
  const [childImage, setChildImage] = useState<string | null>(null);
  const [childImagePreview, setChildImagePreview] = useState<string | null>(null);

  const [storyIdea, setStoryIdea] = useState("");
  const [extraDetails, setExtraDetails] = useState("");
  const [setting, setSetting] = useState("");
  const [moralLesson, setMoralLesson] = useState("");
  const [storyLength, setStoryLength] = useState<"short" | "medium" | "long">("short");
  const [language, setLanguage] = useState<"english" | "french" | "arabic">("english");

  const handleImageUpload = (file: File) => {
    const supportedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!supportedTypes.includes(file.type)) {
      setError("Please use a JPG, PNG, or WebP photo.");
      return;
    }
    if (file.size > 3 * 1024 * 1024) {
      setError("Please choose a photo smaller than 3 MB.");
      return;
    }
    setError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setChildImage(dataUrl);
      setChildImagePreview(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerate = async () => {
    if (!childName || !storyIdea.trim()) {
      setError("Please fill in your child's name and describe the story you want.");
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedStory(null);

    try {
      const token = await getToken?.();
      const result = await generateCustomStory(token as string, {
        childName,
        childAge,
        childImage: childImage || undefined,
        storyIdea: storyIdea.trim(),
        extraDetails: extraDetails.trim() || undefined,
        setting: setting.trim() || undefined,
        moralLesson: moralLesson.trim() || undefined,
        storyLength,
        language,
      });

      setGeneratedStory({
        storyId: result.storyId,
        title: result.title,
        childName: result.childName || childName,
        pages: result.pages,
      });

      if (typeof result.trialsRemaining === "number") {
        trialUpdateEvent.dispatchEvent(
          new CustomEvent("trialUpdate", { detail: result.trialsRemaining })
        );
      }
    } catch (err) {
      console.error("Custom generation failed", err);
      const errorResponse = err instanceof AxiosError ? err.response : undefined;
      let msg = "Failed to generate your custom story";
      if (errorResponse?.data) {
        if (typeof errorResponse.data === "string") {
          msg = errorResponse.data;
        } else if (errorResponse.data.message) {
          msg = errorResponse.data.message;
        }
      }
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (step) {
      case 0: return !!childName.trim() && !!childImage;
      case 1: return !!storyIdea.trim();
      case 2: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (canProceed()) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const prevStep = () => setStep((s) => Math.max(s - 1, 0));

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Card className="max-w-md p-8 text-center">
          <User className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
          <h2 className="mb-2 font-display text-2xl font-bold text-violet-deep">
            Sign in to Create Stories
          </h2>
          <p className="mb-6 text-muted-foreground">
            Join to create personalized storybooks with your child as the hero.
          </p>
          <Button
            onClick={() => router.push("/login")}
            className="bg-buttercup/100 text-white hover:bg-violet-deep"
          >
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  if (generatedStory) {
    const previewPages = generatedStory.pages.slice(0, 2);

    return (
      <div className="mx-auto max-w-5xl space-y-8 pb-12">
        <Card className="rounded-3xl border-buttercup/30 bg-gradient-to-b from-buttercup/15 via-white to-blush/40 p-8 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-violet-deep text-white shadow-lg shadow-primary/20">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="mb-2 font-display text-3xl font-bold text-violet-deep sm:text-4xl">
            {generatedStory.title} is Ready! 🎉
          </h2>
          <p className="mx-auto max-w-xl text-sm text-muted-foreground sm:text-base">
            Here is an exclusive preview of the first 2 pages of{" "}
            <strong>{generatedStory.childName}&apos;s</strong> custom story, written
            exactly from your own idea.
          </p>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold text-violet-deep">
              <BookOpen className="h-5 w-5 text-primary" /> Story Preview (First 2 Pages)
            </h3>
            <span className="rounded-full bg-buttercup/20 px-3 py-1 text-xs font-semibold text-violet-deep">
              Pages 1 & 2 of {generatedStory.pages.length}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {previewPages.map((page, idx) => (
              <div
                key={page.pageNumber || idx}
                className="flex flex-col overflow-hidden rounded-3xl border border-border bg-white shadow-xl transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl"
              >
                <div className="flex items-center justify-between bg-primary px-4 py-2.5 text-white">
                  <span className="text-xs font-bold tracking-wider text-buttercup uppercase">
                    Page {page.pageNumber || idx + 1}
                  </span>
                  <span className="font-mono text-[10px] text-muted-foreground">
                    {generatedStory.childName}&apos;s Custom Story
                  </span>
                </div>
                <div className="group relative aspect-video bg-muted overflow-hidden">
                  {page.imageUrl ? (
                    <img
                      src={page.imageUrl}
                      alt={`Illustration for page ${page.pageNumber}`}
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-buttercup/10 p-6 text-center">
                      <Sparkles className="mb-2 h-8 w-8 animate-pulse text-buttercup" />
                      <p className="font-display text-xs text-muted-foreground">
                        Illustration Preview
                      </p>
                    </div>
                  )}
                </div>
                <div className="flex flex-1 flex-col justify-between border-t border-border bg-gradient-to-b from-buttercup/10 to-paper p-6">
                  <p className="font-display text-base leading-relaxed text-foreground italic">
                    &ldquo;{page.content}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="rounded-3xl border-purple-500/20 bg-gradient-to-r from-violet-deep via-violet-ink to-violet-deep p-8 text-white shadow-2xl">
          <div className="flex flex-col items-center justify-between gap-6 text-center md:flex-row md:text-left">
            <div className="space-y-2">
              <h4 className="font-display text-2xl font-bold text-white">
                The full illustrated storybook is being compiled
              </h4>
              <p className="max-w-lg text-sm text-muted-foreground">
                All {generatedStory.pages.length} illustrated pages are generated in
                the background and the printable PDF is added to your storybook library
                when ready.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:w-auto md:shrink-0">
              <Button
                onClick={() => router.push("/storybook/dashboard")}
                className="rounded-2xl bg-gradient-to-r from-primary to-violet-deep px-8 py-6 text-base font-bold text-white shadow-xl shadow-primary/25 transition-all hover:scale-105 hover:from-violet-deep hover:to-violet"
              >
                <BookOpen className="mr-2 h-5 w-5" />
                View My Storybook
              </Button>
            </div>
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-6 text-xs text-white/50">
            <button
              onClick={() => {
                setGeneratedStory(null);
                setStep(0);
              }}
              className="underline transition-colors hover:text-buttercup"
            >
              ← Create Another Custom Story
            </button>
            <span>Previewing first 2 generated pages</span>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <div className="relative flex items-center justify-between">
          <div className="absolute top-6 right-0 left-0 h-0.5 bg-muted" />
          <div
            className="absolute top-6 left-0 h-0.5 bg-buttercup/100 transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === step;
            const isComplete = index < step;
            return (
              <div key={s.title} className="relative z-10 flex flex-col items-center">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full transition-all duration-300 ${
                    isActive
                      ? "scale-110 bg-buttercup/100 text-white shadow-lg shadow-primary/20"
                      : isComplete
                        ? "bg-emerald-500 text-white"
                        : "border-2 border-border bg-white text-muted-foreground"
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="h-6 w-6" /> : <Icon className="h-5 w-5" />}
                </div>
                <span className={`mt-2 text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <Card className="overflow-hidden border-border p-8 shadow-xl">
        <AnimatePresence mode="wait">
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="mb-8 text-center">
                <h2 className="font-display text-3xl font-bold text-violet-deep">
                  Who is the Hero?
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Use one clear, front-facing photo so the hero stays recognizable on every page.
                </p>
              </div>

              <div
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
                  childImagePreview
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-buttercup/50 bg-buttercup/10 hover:border-primary"
                }`}
              >
                {childImagePreview ? (
                  <div className="flex flex-col items-center gap-4">
                    <Image
                      src={childImagePreview}
                      alt="Child preview"
                      width={128}
                      height={128}
                      className="h-32 w-32 rounded-full border-4 border-buttercup/50 object-cover shadow-lg"
                      onError={handleImageError}
                    />
                    <div className="flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Photo attached for AI face matching
                    </div>
                    <p className="text-xs text-muted-foreground">Click to change photo</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-buttercup/20">
                      <Upload className="h-8 w-8 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground">
                      Upload your child&apos;s photo <span className="font-bold text-red-500">*</span>
                    </p>
                    <p className="rounded-full bg-buttercup/20 px-3 py-1.5 text-xs font-medium text-violet-deep">
                      JPG, PNG, or WebP · clear face · one child · up to 3 MB
                    </p>
                  </div>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageUpload(file);
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Hero&apos;s Name *</Label>
                  <Input
                    value={childName}
                    onChange={(e) => setChildName(e.target.value)}
                    placeholder="Emma"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Age</Label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    value={childAge}
                    onChange={(e) => setChildAge(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="mb-8 text-center">
                <h2 className="font-display text-3xl font-bold text-violet-deep">
                  Describe Your Own Story
                </h2>
                <p className="mt-2 text-muted-foreground">
                  No templates — write any story you can imagine and we&apos;ll write it as a book for your child.
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Your Story Idea <span className="font-bold text-red-500">*</span>
                </Label>
                <Textarea
                  value={storyIdea}
                  onChange={(e) => setStoryIdea(e.target.value)}
                  placeholder="e.g., Leo finds a tiny talking door in his bedroom wall that opens to a candy forest where the sun is made of golden honey, and he must cross a river of melted chocolate to bring back a drop of sunshine for his sick grandmother..."
                  rows={5}
                  className="mt-1 resize-y"
                />
                <p className="text-xs text-muted-foreground">
                  Be as specific or as wild as you like — the AI builds the whole book from this.
                </p>
              </div>

              <div className="space-y-2">
                <Label>
                  Setting <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  value={setting}
                  onChange={(e) => setSetting(e.target.value)}
                  placeholder="e.g., at night in the backyard, during a storm, on a pirate ship"
                  className="mt-1"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Extras <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  value={extraDetails}
                  onChange={(e) => setExtraDetails(e.target.value)}
                  placeholder="Side characters, objects, twists or details to include — e.g., a purple cat named Luna helps him, and at the end there's a surprise birthday party..."
                  rows={3}
                  className="mt-1 resize-y"
                />
              </div>

              <div className="space-y-2">
                <Label>
                  Message to teach <span className="text-muted-foreground">(optional)</span>
                </Label>
                <Input
                  value={moralLesson}
                  onChange={(e) => setMoralLesson(e.target.value)}
                  placeholder="e.g., sharing makes adventures sweeter"
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Story Length</Label>
                  <Select value={storyLength} onValueChange={(v) => setStoryLength(v as "short" | "medium" | "long")}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOM_STORY_LENGTHS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Story Language</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as "english" | "french" | "arabic")}>
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CUSTOM_STORY_LANGUAGES.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="mb-8 text-center">
                <h2 className="font-display text-3xl font-bold text-violet-deep">
                  Ready to Create Magic?
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Review your custom story brief and generate your personalized storybook
                </p>
              </div>

              <div className="space-y-4 rounded-2xl bg-gradient-to-br from-buttercup/15 to-blush/40 p-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-muted-foreground text-xs tracking-wide uppercase">Hero</span>
                    <p className="text-lg font-medium text-violet-deep">{childName}, age {childAge}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground text-xs tracking-wide uppercase">Language</span>
                    <p className="flex items-center gap-1.5 font-medium text-violet-deep">
                      <Languages className="h-4 w-4" />
                      {CUSTOM_STORY_LANGUAGES.find((l) => l.value === language)?.label}
                    </p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground text-xs tracking-wide uppercase">Your Story Idea</span>
                    <p className="font-medium text-violet-deep">{storyIdea}</p>
                  </div>
                  {setting.trim() && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs tracking-wide uppercase">Setting</span>
                      <p className="font-medium text-violet-deep">{setting.trim()}</p>
                    </div>
                  )}
                  {extraDetails.trim() && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs tracking-wide uppercase">Extras</span>
                      <p className="font-medium text-violet-deep">{extraDetails.trim()}</p>
                    </div>
                  )}
                  {moralLesson.trim() && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground text-xs tracking-wide uppercase">Message</span>
                      <p className="font-medium text-violet-deep">{moralLesson.trim()}</p>
                    </div>
                  )}
                  {childImagePreview && (
                    <div>
                      <span className="text-muted-foreground text-xs tracking-wide uppercase">Hero Photo</span>
                      <div className="mt-1 flex items-center gap-2">
                        <Image
                          src={childImagePreview}
                          alt="Hero"
                          width={40}
                          height={40}
                          className="h-10 w-10 rounded-full border-2 border-buttercup/50 object-cover"
                          onError={handleImageError}
                        />
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-xl bg-blue-50 p-4 text-sm text-blue-800">
                <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0" />
                <p>
                  Generation takes about 30-60 seconds. Images are generated live with
                  Fal AI and the story is written from your own idea — no template involved!
                </p>
              </div>

              {error && <div className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error}</div>}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex justify-between border-t border-border pt-8">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 0 || loading}
            className="text-muted-foreground"
          >
            <ChevronLeft className="mr-1 h-4 w-4" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="bg-primary text-white hover:bg-violet-deep"
            >
              Continue <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={loading || !canProceed()}
              className="bg-gradient-to-r from-primary to-violet-deep text-white shadow-lg shadow-primary/20 hover:opacity-90"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating Magic...
                </>
              ) : (
                <>
                  <Wand2 className="mr-2 h-4 w-4" />
                  Generate My Story
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}