"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Download,
  ShoppingBag,
  Package,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { handleImageError } from "@/components/ui/image-fallback";
import { Card } from "@/components/ui/card";
import { OrderBookModal } from "../../storybook/components/OrderBookModal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { useAuth } from "@/hooks/useAuth";
import { trialUpdateEvent } from "@/hooks/use-trials";
import { BACKEND_URL } from "../../../app/config";
import { STORY_CATEGORIES, STORY_LENGTH_CONFIG } from "../../../services/fal/storyGeneration";
import { STORY_STARTERS } from "../../../utils/prompts/storyPrompts";

// Templates matching the ones defined on the backend
const TEMPLATES: Record<string, { theme: string; category: string }> = {
  "magical-adventure": { theme: "discovers a magical portal and goes on an amazing adventure", category: "adventure" },
  "brave-explorer":    { theme: "becomes a brave explorer and discovers hidden treasures", category: "adventure" },
  "kind-friend":       { theme: "helps a lost animal find its way home and makes a new friend", category: "friendship" },
  "space-adventure":   { theme: "blasts off in a rocket ship and meets friendly aliens", category: "space" },
  "bedtime-dream":     { theme: "floats up to the clouds and has a magical dream adventure", category: "bedtime" },
  "animal-friends":    { theme: "visits a magical forest and befriends talking animals", category: "animals" },
  "superhero-day":     { theme: "wakes up with super powers and saves the day", category: "superhero" },
  "ocean-adventure":   { theme: "dives under the ocean and discovers a mermaid kingdom", category: "ocean" },
  // Home page story gallery templates
  "rocket-to-the-stars":   { theme: "builds a rocket with tools from the shed, blasts off to the moon and befriends a tiny alien named Fizz who needs help finding his way back to his star", category: "space" },
  "the-ocean-kingdom":     { theme: "puts on a magic diving helmet, explores the deep sea and helps princess coral find her lost pearl-that-holds-the-sunset before the tide goes out", category: "ocean" },
  "the-enchanted-forest":  { theme: "steps into a glowing forest where animals can talk and solves the riddle of the sleeping waterfall to bring the magic back to the woods", category: "animals" },
  "the-lost-puppy":        { theme: "finds a scared lost puppy in the rain, comforts it with patience and gentleness, and helps it find its way back to its family", category: "animals" },
  "the-bravest-hug":       { theme: "has butterflies before the first day of a new school and learns from the people who love them that the bravest thing is to share their feelings and ask for a hug", category: "bedtime" },
  "grandmas-moonlight-garden": { theme: "spends a quiet evening with grandma in the moonlight garden, hears the story of every flower and learns that family love stays with us forever", category: "bedtime" },
  "the-planet-hop":        { theme: "joins professor Zuzu the teacher alien on a solar-system scavenger hunt and learns the order of the planets by visiting every one", category: "space" },
  "a-world-of-words":      { theme: "discovers a magic library where letters come alive, learns to recognize them and sound out first words to help them get back into their books", category: "bedtime" },
  "the-tiny-gardeners":    { theme: "plants seeds in the family garden with grandma, learns what plants need to grow - soil, water, sunlight and patience - and watches a tiny garden come to life", category: "animals" },
};

const STEPS = [
  { title: "Your Hero", description: "Upload a photo of your child", icon: User },
  { title: "Story Theme", description: "Pick the adventure", icon: BookOpen },
  { title: "Generate", description: "Create your story", icon: Sparkles },
];

interface StoryPageData {
  pageNumber: number;
  content: string;
  imageUrl?: string | null;
}

interface GeneratedStoryResult {
  storyId: string;
  title: string;
  childName: string;
  pdfUrl: string;
  pages: StoryPageData[];
}

export function StoryGenerator() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { getToken, user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedStory, setGeneratedStory] = useState<GeneratedStoryResult | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [pdfTitle, setPdfTitle] = useState<string>("");

  // Form data
  const [childName, setChildName] = useState("");
  const [childAge, setChildAge] = useState(5);
  const [childImage, setChildImage] = useState<string | null>(null);
  const [childImagePreview, setChildImagePreview] = useState<string | null>(null);
  const [theme, setTheme] = useState("");
  const [category, setCategory] = useState("adventure");
  const [storyLength, setStoryLength] = useState<"short" | "medium" | "long">("short");
  const [dedication, setDedication] = useState("");

  // Pre-fill from ?templateId query param
  useEffect(() => {
    const templateId = searchParams?.get("templateId");
    if (templateId && TEMPLATES[templateId]) {
      setTheme(TEMPLATES[templateId].theme);
      setCategory(TEMPLATES[templateId].category);
    }
  }, [searchParams]);

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
    if (!childName || !theme) {
      setError("Please complete all required fields");
      return;
    }

    setLoading(true);
    setError(null);
    setPdfUrl(null);
    setGeneratedStory(null);

    try {
      const token = await getToken?.();

      const response = await axios.post(
        `${BACKEND_URL}/storybook/generate-pdf`,
        {
          childName,
          childAge,
          theme,
          category,
          storyLength,
          dedication: dedication || undefined,
          childImage: childImage || undefined,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data?.storyId && response.data?.pages) {
        setGeneratedStory({
          storyId: response.data.storyId,
          title: response.data.title || `${childName}'s Storybook`,
          childName: response.data.childName || childName,
          pdfUrl: response.data.pdfUrl,
          pages: response.data.pages,
        });

        // One free generation was consumed server-side - refresh the counter
        if (typeof response.data.trialsRemaining === "number") {
          trialUpdateEvent.dispatchEvent(
            new CustomEvent("trialUpdate", { detail: response.data.trialsRemaining })
          );
        }
      } else if (response.data instanceof Blob) {
        const blob = new Blob([response.data], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        setPdfUrl(url);
        setPdfTitle(`${childName}'s Storybook`);
      }
    } catch (err) {
      console.error("Generation failed", err);
      const errorResponse = err instanceof AxiosError ? err.response : undefined;
      let msg = "Failed to generate storybook";
      if (errorResponse?.data) {
        if (typeof errorResponse.data === "string") {
          msg = errorResponse.data;
        } else if (errorResponse.data.message) {
          msg = errorResponse.data.message;
        } else if (errorResponse.data instanceof Blob) {
          msg = await errorResponse.data.text().then((t: string) => {
            try { return JSON.parse(t).message || t; } catch { return t; }
          });
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
      case 1: return !!theme.trim();
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
      <div className="min-h-[60vh] flex items-center justify-center">
        <Card className="p-8 text-center max-w-md">
          <User className="w-16 h-16 mx-auto text-stone-300 mb-4" />
          <h2 className="text-2xl font-serif font-bold text-stone-900 mb-2">
            Sign in to Create Stories
          </h2>
          <p className="text-stone-500 mb-6">
            Join to create personalized storybooks with your child as the hero.
          </p>
          <Button
            onClick={() => router.push("/sign-in")}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            Sign In
          </Button>
        </Card>
      </div>
    );
  }

  // Show 2-page preview UI after generation
  if (generatedStory) {
    const previewPages = generatedStory.pages.slice(0, 2);
    const pdfDownloadUrl = generatedStory.pdfUrl.startsWith("http")
      ? generatedStory.pdfUrl
      : `${BACKEND_URL}${generatedStory.pdfUrl}`;

    return (
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Celebration Header */}
        <Card className="p-8 text-center bg-gradient-to-b from-amber-50/80 via-white to-orange-50/50 shadow-xl border-amber-100/60 rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-400 to-orange-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-serif font-bold text-stone-900 mb-2">
            {generatedStory.title} is Ready! 🎉
          </h2>
          <p className="text-stone-600 max-w-xl mx-auto text-sm sm:text-base">
            Here is an exclusive preview of the first 2 pages of <strong>{generatedStory.childName}&apos;s</strong> adventure book.
          </p>
        </Card>

        {/* 2-Page Preview Spread */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-serif font-bold text-stone-900 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-500" /> Story Preview (First 2 Pages)
            </h3>
            <span className="text-xs font-semibold px-3 py-1 bg-amber-100 text-amber-800 rounded-full">
              Pages 1 & 2 of {generatedStory.pages.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {previewPages.map((page, idx) => (
              <div
                key={page.pageNumber || idx}
                className="bg-white rounded-3xl border border-stone-200 shadow-xl overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:-translate-y-1 duration-300"
              >
                {/* Page Header */}
                <div className="bg-stone-900 px-4 py-2.5 flex items-center justify-between text-white">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                    Page {page.pageNumber || idx + 1}
                  </span>
                  <span className="text-[10px] text-stone-400 font-mono">
                    {generatedStory.childName}&apos;s Adventure
                  </span>
                </div>

                {/* Illustration Frame */}
                <div className="relative aspect-video bg-stone-100 overflow-hidden group">
                  {page.imageUrl ? (
                    <img
                      src={page.imageUrl}
                      alt={`Illustration for page ${page.pageNumber}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-amber-50/50 p-6 text-center">
                      <Sparkles className="w-8 h-8 text-amber-400 mb-2 animate-pulse" />
                      <p className="text-xs text-stone-500 font-serif">Illustration Preview</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Story Text Content */}
                <div className="p-6 bg-gradient-to-b from-amber-50/30 to-stone-50/50 flex-1 flex flex-col justify-between border-t border-stone-100">
                  <p className="text-stone-800 font-serif text-base leading-relaxed italic">
                    &ldquo;{page.content}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action CTA Banner */}
        <Card className="p-8 bg-gradient-to-r from-stone-900 via-purple-950 to-stone-900 text-white rounded-3xl shadow-2xl border-purple-500/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-400/20 text-amber-300 rounded-full text-xs font-semibold border border-amber-400/30">
                <Package className="w-3.5 h-3.5" /> Hardcover Printed Edition Available
              </div>
              <h4 className="text-2xl font-serif font-bold text-white">
                Get the Full Printed Storybook Delivered!
              </h4>
              <p className="text-stone-300 text-sm max-w-lg">
                Order a high-quality hardcover print of {generatedStory.title} with all {generatedStory.pages.length} illustrated pages delivered directly to your doorstep.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <Button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-8 py-6 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-bold text-base rounded-2xl shadow-xl shadow-amber-500/20 transition-all hover:scale-105"
              >
                <ShoppingBag className="w-5 h-5 mr-2" />
                Order Printed Book Now
              </Button>
            </div>
          </div>

          <div className="pt-6 mt-6 border-t border-white/10 flex flex-wrap justify-between items-center gap-4 text-xs text-white/50">
            <button
              onClick={() => {
                setGeneratedStory(null);
                setPdfUrl(null);
                setStep(0);
              }}
              className="hover:text-amber-300 transition-colors underline"
            >
              ← Create Another Story
            </button>
            <span>Previewing first 2 generated pages</span>
          </div>
        </Card>

        {/* Order Modal */}
        <OrderBookModal
          open={isOrderModalOpen}
          onOpenChange={setIsOrderModalOpen}
          story={{
            id: generatedStory.storyId,
            title: generatedStory.title,
            childName: generatedStory.childName,
          }}
        />
      </div>
    );
  }

  // Fallback PDF view
  if (pdfUrl) {
    return (
      <div className="max-w-4xl mx-auto">
        <Card className="p-12 text-center shadow-xl border-stone-100">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-serif font-bold text-stone-900 mb-2">
            Your Storybook is Ready! 🎉
          </h2>
          <p className="text-stone-500 mb-8">{pdfTitle} has been created with Fal AI illustrations.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={pdfUrl}
              download={`${pdfTitle || "storybook"}.pdf`}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg shadow-amber-200 hover:opacity-90 transition-opacity"
            >
              <Download className="w-5 h-5" />
              Download PDF
            </a>
            <Button
              variant="outline"
              onClick={() => { setPdfUrl(null); setStep(0); }}
              className="px-8 py-3"
            >
              Create Another Story
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex justify-between items-center relative">
          <div className="absolute left-0 right-0 top-6 h-0.5 bg-stone-200" />
          <div
            className="absolute left-0 top-6 h-0.5 bg-amber-500 transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === step;
            const isComplete = index < step;
            return (
              <div key={s.title} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive
                      ? "bg-amber-500 text-white scale-110 shadow-lg shadow-amber-200"
                      : isComplete
                      ? "bg-emerald-500 text-white"
                      : "bg-white border-2 border-stone-200 text-stone-400"
                  }`}
                >
                  {isComplete ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`mt-2 text-xs font-medium ${isActive ? "text-amber-600" : "text-stone-400"}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Card */}
      <Card className="p-8 shadow-xl border-stone-100 overflow-hidden">
        <AnimatePresence mode="wait">

          {/* Step 0: Upload child photo */}
          {step === 0 && (
            <motion.div
              key="step0"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-serif font-bold text-stone-900">Who is the Hero?</h2>
                <p className="text-stone-500 mt-2">Use one clear, front-facing photo so the hero stays recognizable on every page.</p>
              </div>

              {/* Photo upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                  childImagePreview
                    ? "border-emerald-400 bg-emerald-50/30"
                    : "border-amber-300 hover:border-amber-500 bg-amber-50/20"
                }`}
              >
                {childImagePreview ? (
                  <div className="flex flex-col items-center gap-4">
                    <Image
                      src={childImagePreview}
                      alt="Child preview"
                      width={128}
                      height={128}
                      className="w-32 h-32 rounded-full object-cover border-4 border-amber-300 shadow-lg"
                      onError={handleImageError}
                    />
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Photo attached for AI face matching
                    </div>
                    <p className="text-xs text-stone-400">Click to change photo</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-amber-500" />
                    </div>
                    <p className="font-semibold text-stone-800">
                      Upload your child&apos;s photo <span className="text-red-500 font-bold">*</span>
                    </p>
                    <p className="text-xs font-medium text-amber-700 bg-amber-100 px-3 py-1.5 rounded-full">
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
                    min={3}
                    max={12}
                    value={childAge}
                    onChange={(e) => setChildAge(Number(e.target.value))}
                    className="mt-1"
                  />
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 1: Story Theme */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-serif font-bold text-stone-900">What&apos;s the Adventure?</h2>
                <p className="text-stone-500 mt-2">Choose a theme or write your own story idea</p>
              </div>

              <div className="space-y-3">
                <Label>Quick Starters</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {STORY_STARTERS.slice(0, 8).map((starter) => (
                    <button
                      key={starter.id}
                      onClick={() => { setTheme(starter.theme); setCategory(starter.category); }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        theme === starter.theme
                          ? "border-amber-500 bg-amber-50"
                          : "border-stone-200 hover:border-stone-300"
                      }`}
                    >
                      <span className="text-2xl block mb-1">{starter.icon}</span>
                      <span className="text-sm font-medium text-stone-900">{starter.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Or Write Your Own</Label>
                <Input
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  placeholder="e.g., Travels to a magical forest and befriends talking animals..."
                  className="h-12"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Story Length</Label>
                  <Select value={storyLength} onValueChange={(v) => setStoryLength(v as "short" | "medium" | "long")}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(STORY_LENGTH_CONFIG).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STORY_CATEGORIES.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>{cat.icon} {cat.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Dedication <span className="text-stone-400">(optional)</span></Label>
                <Input
                  value={dedication}
                  onChange={(e) => setDedication(e.target.value)}
                  placeholder="To the bravest explorer we know — Mom & Dad"
                />
              </div>
            </motion.div>
          )}

          {/* Step 2: Generate */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="text-3xl font-serif font-bold text-stone-900">Ready to Create Magic?</h2>
                <p className="text-stone-500 mt-2">Review your choices and generate your personalized storybook</p>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-stone-500">Hero</span>
                    <p className="font-medium text-stone-900 text-lg">{childName}, age {childAge}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-stone-500">Story Length</span>
                    <p className="font-medium text-stone-900">{STORY_LENGTH_CONFIG[storyLength].label}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs uppercase tracking-wide text-stone-500">Adventure Theme</span>
                    <p className="font-medium text-stone-900">{theme}</p>
                  </div>
                  {dedication.trim() && (
                    <div className="col-span-2">
                      <span className="text-xs uppercase tracking-wide text-stone-500">Dedication</span>
                      <p className="font-medium text-stone-900">{dedication.trim()}</p>
                    </div>
                  )}
                  {childImagePreview && (
                    <div>
                      <span className="text-xs uppercase tracking-wide text-stone-500">Hero Photo</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Image src={childImagePreview} alt="Hero" width={40} height={40} className="w-10 h-10 rounded-full object-cover border-2 border-amber-300" onError={handleImageError} />
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3 bg-blue-50 text-blue-800 p-4 rounded-xl text-sm">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <p>
                  Generation takes about{" "}
                  <strong>{STORY_LENGTH_CONFIG[storyLength].pages * 30} seconds</strong>.
                  Images are generated live with Fal AI — no model training required!
                </p>
              </div>

              {error && (
                <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">{error}</div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between pt-8 mt-8 border-t border-stone-100">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 0 || loading}
            className="text-stone-500"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="bg-stone-900 text-white hover:bg-stone-800"
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={loading || !canProceed()}
              className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 shadow-lg shadow-amber-200"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating Magic...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Story
                </>
              )}
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export default StoryGenerator;
