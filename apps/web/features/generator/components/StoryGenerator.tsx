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
  PenLine,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { STORY_CATEGORIES, STORY_LANGUAGES, STORY_LENGTH_CONFIG } from "../../../services/fal/storyGeneration";
import { STORY_STARTERS } from "../../../utils/prompts/storyPrompts";

// Templates matching the ones defined on the backend
const TEMPLATES: Record<string, { theme: string; category: string }> = {
  "magical-adventure": { theme: "discovers a magical portal and goes on an amazing adventure", category: "adventure" },
  "brave-explorer": { theme: "becomes a brave explorer and discovers hidden treasures", category: "adventure" },
  "kind-friend": { theme: "helps a lost animal find its way home and makes a new friend", category: "friendship" },
  "space-adventure": { theme: "blasts off in a rocket ship and meets friendly aliens", category: "space" },
  "bedtime-dream": { theme: "floats up to the clouds and has a magical dream adventure", category: "bedtime" },
  "animal-friends": { theme: "visits a magical forest and befriends talking animals", category: "animals" },
  "superhero-day": { theme: "wakes up with super powers and saves the day", category: "superhero" },
  "ocean-adventure": { theme: "dives under the ocean and discovers a mermaid kingdom", category: "ocean" },
  // Home page story gallery templates
  "rocket-to-the-stars": { theme: "builds a rocket with tools from the shed, blasts off to the moon and befriends a tiny alien named Fizz who needs help finding his way back to his star", category: "space" },
  "the-ocean-kingdom": { theme: "puts on a magic diving helmet, explores the deep sea and helps princess coral find her lost pearl-that-holds-the-sunset before the tide goes out", category: "ocean" },
  "the-enchanted-forest": { theme: "steps into a glowing forest where animals can talk and solves the riddle of the sleeping waterfall to bring the magic back to the woods", category: "animals" },
  "the-lost-puppy": { theme: "finds a scared lost puppy in the rain, comforts it with patience and gentleness, and helps it find its way back to its family", category: "animals" },
  "the-bravest-hug": { theme: "has butterflies before the first day of a new school and learns from the people who love them that the bravest thing is to share their feelings and ask for a hug", category: "bedtime" },
  "grandmas-moonlight-garden": { theme: "spends a quiet evening with grandma in the moonlight garden, hears the story of every flower and learns that family love stays with us forever", category: "bedtime" },
  "the-planet-hop": { theme: "joins professor Zuzu the teacher alien on a solar-system scavenger hunt and learns the order of the planets by visiting every one", category: "space" },
  "a-world-of-words": { theme: "discovers a magic library where letters come alive, learns to recognize them and sound out first words to help them get back into their books", category: "bedtime" },
  "the-tiny-gardeners": { theme: "plants seeds in the family garden with grandma, learns what plants need to grow - soil, water, sunlight and patience - and watches a tiny garden come to life", category: "animals" },
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
  const [customMode, setCustomMode] = useState(false);
  const [customIdea, setCustomIdea] = useState("");
  const [customSetting, setCustomSetting] = useState("");
  const [customExtras, setCustomExtras] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [storyLength, setStoryLength] = useState<"short" | "medium" | "long">("short");
  const [storyLanguage, setStoryLanguage] = useState<"english" | "french" | "arabic">("english");
  const [dedication, setDedication] = useState("");

  const buildCustomTheme = () => {
    const parts = [customIdea.trim()];
    if (customSetting.trim()) parts.push(`Setting: ${customSetting.trim()}`);
    if (customExtras.trim()) parts.push(`Include: ${customExtras.trim()}`);
    if (customMessage.trim()) parts.push(`Message: ${customMessage.trim()}`);
    return parts.filter(Boolean).join(". ");
  };

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
    if (!childName || !(customMode ? customIdea.trim() : theme)) {
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
          theme: customMode ? buildCustomTheme() : theme,
          category,
          storyLength,
          language: storyLanguage,
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
      case 1: return customMode ? !!customIdea.trim() : !!theme.trim();
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
          <User className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-display font-bold text-violet-deep mb-2">
            Sign in to Create Stories
          </h2>
          <p className="text-muted-foreground mb-6">
            Join to create personalized storybooks with your child as the hero.
          </p>
          <Button
            onClick={() => router.push("/login")}
            className="bg-buttercup/100 hover:bg-violet-deep text-white"
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
        <Card className="p-8 text-center bg-gradient-to-b from-buttercup/15 via-white to-blush/40 shadow-xl border-buttercup/30 rounded-3xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-violet-deep text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-violet-deep mb-2">
            {generatedStory.title} is Ready! 🎉
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Here is an exclusive preview of the first 2 pages of <strong>{generatedStory.childName}&apos;s</strong> adventure book.
          </p>
        </Card>

        {/* 2-Page Preview Spread */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-display font-bold text-violet-deep flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Story Preview (First 2 Pages)
            </h3>
            <span className="text-xs font-semibold px-3 py-1 bg-buttercup/20 text-violet-deep rounded-full">
              Pages 1 & 2 of {generatedStory.pages.length}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {previewPages.map((page, idx) => (
              <div
                key={page.pageNumber || idx}
                className="bg-white rounded-3xl border border-border shadow-xl overflow-hidden flex flex-col transition-all hover:shadow-2xl hover:-translate-y-1 duration-300"
              >
                {/* Page Header */}
                <div className="bg-primary px-4 py-2.5 flex items-center justify-between text-white">
                  <span className="text-xs font-bold uppercase tracking-wider text-buttercup">
                    Page {page.pageNumber || idx + 1}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {generatedStory.childName}&apos;s Adventure
                  </span>
                </div>

                {/* Illustration Frame */}
                <div className="relative aspect-video bg-muted overflow-hidden group">
                  {page.imageUrl ? (
                    <img
                      src={page.imageUrl}
                      alt={`Illustration for page ${page.pageNumber}`}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      onError={handleImageError}
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-buttercup/10/50 p-6 text-center">
                      <Sparkles className="w-8 h-8 text-buttercup mb-2 animate-pulse" />
                      <p className="text-xs text-muted-foreground font-display">Illustration Preview</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>

                {/* Story Text Content */}
                <div className="p-6 bg-gradient-to-b from-buttercup/10 to-paper flex-1 flex flex-col justify-between border-t border-border">
                  <p className="text-foreground font-display text-base leading-relaxed italic">
                    &ldquo;{page.content}&rdquo;
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Action CTA Banner */}
        <Card className="p-8 bg-gradient-to-r from-violet-deep via-violet-ink to-violet-deep text-white rounded-3xl shadow-2xl border-purple-500/20">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="space-y-2 text-center md:text-left">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-buttercup/20 text-buttercup rounded-full text-xs font-semibold border border-buttercup/40">
                <Package className="w-3.5 h-3.5" /> Hardcover Printed Edition Available
              </div>
              <h4 className="text-2xl font-display font-bold text-white">
                Get the Full Printed Storybook Delivered!
              </h4>
              <p className="text-muted-foreground text-sm max-w-lg">
                Order a high-quality hardcover print of {generatedStory.title} with all {generatedStory.pages.length} illustrated pages delivered directly to your doorstep.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
              <Button
                onClick={() => setIsOrderModalOpen(true)}
                className="px-8 py-6 bg-gradient-to-r from-primary to-violet-deep hover:from-violet-deep hover:to-violet text-white font-bold text-base rounded-2xl shadow-xl shadow-primary/25 transition-all hover:scale-105"
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
              className="hover:text-buttercup transition-colors underline"
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
        <Card className="p-12 text-center shadow-xl border-border">
          <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h2 className="text-3xl font-display font-bold text-violet-deep mb-2">
            Your Storybook is Ready! 🎉
          </h2>
          <p className="text-muted-foreground mb-8">{pdfTitle} has been created with Fal AI illustrations.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={pdfUrl}
              download={`${pdfTitle || "storybook"}.pdf`}
              className="inline-flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-primary to-violet-deep text-white rounded-xl font-semibold shadow-lg shadow-primary/20 hover:opacity-90 transition-opacity"
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
          <div className="absolute left-0 right-0 top-6 h-0.5 bg-muted" />
          <div
            className="absolute left-0 top-6 h-0.5 bg-buttercup/100 transition-all duration-500"
            style={{ width: `${(step / (STEPS.length - 1)) * 100}%` }}
          />
          {STEPS.map((s, index) => {
            const Icon = s.icon;
            const isActive = index === step;
            const isComplete = index < step;
            return (
              <div key={s.title} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 ${isActive
                    ? "bg-buttercup/100 text-white scale-110 shadow-lg shadow-primary/20"
                    : isComplete
                      ? "bg-emerald-500 text-white"
                      : "bg-white border-2 border-border text-muted-foreground"
                    }`}
                >
                  {isComplete ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                </div>
                <span className={`mt-2 text-xs font-medium ${isActive ? "text-primary" : "text-muted-foreground"}`}>
                  {s.title}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Card */}
      <Card className="p-8 shadow-xl border-border overflow-hidden">
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
                <h2 className="text-3xl font-display font-bold text-violet-deep">Who is the Hero?</h2>
                <p className="text-muted-foreground mt-2">Use one clear, front-facing photo so the hero stays recognizable on every page.</p>
              </div>

              {/* Photo upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${childImagePreview
                  ? "border-emerald-400 bg-emerald-50/30"
                  : "border-buttercup/50 hover:border-primary bg-buttercup/10/20"
                  }`}
              >
                {childImagePreview ? (
                  <div className="flex flex-col items-center gap-4">
                    <Image
                      src={childImagePreview}
                      alt="Child preview"
                      width={128}
                      height={128}
                      className="w-32 h-32 rounded-full object-cover border-4 border-buttercup/50 shadow-lg"
                      onError={handleImageError}
                    />
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Photo attached for AI face matching
                    </div>
                    <p className="text-xs text-muted-foreground">Click to change photo</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-16 h-16 rounded-full bg-buttercup/20 flex items-center justify-center">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                    <p className="font-semibold text-foreground">
                      Upload your child&apos;s photo <span className="text-red-500 font-bold">*</span>
                    </p>
                    <p className="text-xs font-medium text-violet-deep bg-buttercup/20 px-3 py-1.5 rounded-full">
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
                <h2 className="text-3xl font-display font-bold text-violet-deep">What&apos;s the Adventure?</h2>
                <p className="text-muted-foreground mt-2">Choose a theme or write your own story idea</p>
              </div>

              <div className="space-y-3">
                <Label>Quick Starters</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  <button
                    onClick={() => setCustomMode(true)}
                    className={`p-3 rounded-xl border-2 text-left transition-all ${customMode
                      ? "border-primary bg-buttercup/10"
                      : "border-dashed border-primary/50 hover:border-primary"
                      }`}
                  >
                    <span className="block mb-1">
                      <PenLine className="w-6 h-6 text-primary" />
                    </span>
                    <span className="text-sm font-bold text-violet-deep">My Own Story</span>
                    <span className="block text-[11px] text-muted-foreground mt-0.5">
                      No template — from your idea
                    </span>
                  </button>
                  {STORY_STARTERS.slice(0, 8).map((starter) => (
                    <button
                      key={starter.id}
                      onClick={() => { setCustomMode(false); setTheme(starter.theme); setCategory(starter.category); }}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${!customMode && theme === starter.theme
                        ? "border-primary bg-buttercup/10"
                        : "border-border hover:border-border"
                        }`}
                    >
                      <span className="text-2xl block mb-1">{starter.icon}</span>
                      <span className="text-sm font-medium text-violet-deep">{starter.title}</span>
                    </button>
                  ))}
                </div>
              </div>

              {customMode ? (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl border-2 border-primary/30 bg-buttercup/5 p-5 space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <PenLine className="w-5 h-5 text-primary" />
                    <h3 className="font-display font-bold text-violet-deep">
                      Write your own story from scratch
                    </h3>
                  </div>
                  <div className="space-y-2">
                    <Label>
                      Your story idea *
                    </Label>
                    <Textarea
                      value={customIdea}
                      onChange={(e) => setCustomIdea(e.target.value)}
                      placeholder="e.g., Leo visits grandma's bakery and secretly helps save the day when the oven breaks before the town festival..."
                      className="min-h-28"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Setting <span className="text-muted-foreground">(optional)</span></Label>
                      <Input
                        value={customSetting}
                        onChange={(e) => setCustomSetting(e.target.value)}
                        placeholder="e.g., A snowy mountain village"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Extras to include <span className="text-muted-foreground">(optional)</span></Label>
                      <Input
                        value={customExtras}
                        onChange={(e) => setCustomExtras(e.target.value)}
                        placeholder="e.g., A fluffy rabbit, a magic sleigh"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>A message to teach <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      value={customMessage}
                      onChange={(e) => setCustomMessage(e.target.value)}
                      placeholder="e.g., Helping others makes us braver"
                    />
                  </div>
                </motion.div>
              ) : (
                <div className="space-y-2">
                  <Label>Or Write Your Own</Label>
                  <Input
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="e.g., Travels to a magical forest and befriends talking animals..."
                    className="h-12"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Story Length</Label>
                  <Select value={storyLength} onValueChange={(v) => setStoryLength(v as "short" | "medium" | "long")}>
                    <SelectTrigger className="mt-1 w-full">
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
                  <Label>Story Language</Label>
                  <Select
                    value={storyLanguage}
                    onValueChange={(v) => setStoryLanguage(v as "english" | "french" | "arabic")}
                  >
                    <SelectTrigger className="mt-1 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STORY_LANGUAGES.map((lang) => (
                        <SelectItem key={lang.value} value={lang.value}>{lang.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="col-span-2">
                  <Label>Category</Label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1 w-full">
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
                <Label>Dedication <span className="text-muted-foreground">(optional)</span></Label>
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
                <h2 className="text-3xl font-display font-bold text-violet-deep">Ready to Create Magic?</h2>
                <p className="text-muted-foreground mt-2">Review your choices and generate your personalized storybook</p>
              </div>

              {/* Summary */}
              <div className="bg-gradient-to-br from-buttercup/15 to-blush/40 rounded-2xl p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Hero</span>
                    <p className="font-medium text-violet-deep text-lg">{childName}, age {childAge}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Story Length</span>
                    <p className="font-medium text-violet-deep">{STORY_LENGTH_CONFIG[storyLength].label}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Language</span>
                    <p className="font-medium text-violet-deep">{STORY_LANGUAGES.find((l) => l.value === storyLanguage)?.label}</p>
                  </div>
                  <div className="col-span-2">
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Adventure Theme</span>
                    <p className="font-medium text-violet-deep">{customMode ? buildCustomTheme() : theme}</p>
                  </div>
                  {dedication.trim() && (
                    <div className="col-span-2">
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Dedication</span>
                      <p className="font-medium text-violet-deep">{dedication.trim()}</p>
                    </div>
                  )}
                  {childImagePreview && (
                    <div>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">Hero Photo</span>
                      <div className="flex items-center gap-2 mt-1">
                        <Image src={childImagePreview} alt="Hero" width={40} height={40} className="w-10 h-10 rounded-full object-cover border-2 border-buttercup/50" onError={handleImageError} />
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
        <div className="flex justify-between pt-8 mt-8 border-t border-border">
          <Button
            variant="ghost"
            onClick={prevStep}
            disabled={step === 0 || loading}
            className="text-muted-foreground"
          >
            <ChevronLeft className="w-4 h-4 mr-1" /> Back
          </Button>

          {step < STEPS.length - 1 ? (
            <Button
              onClick={nextStep}
              disabled={!canProceed()}
              className="bg-primary text-white hover:bg-violet-deep"
            >
              Continue <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          ) : (
            <Button
              onClick={handleGenerate}
              disabled={loading || !canProceed()}
              className="bg-gradient-to-r from-primary to-violet-deep text-white hover:opacity-90 shadow-lg shadow-primary/20"
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
