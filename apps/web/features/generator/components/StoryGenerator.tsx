"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
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
  Palette,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { handleImageError } from "@/components/ui/image-fallback";
import { Card } from "@/components/ui/card";
import { OrderBookModal } from "../../storybook/components/OrderBookModal";
import { StoryBookReader } from "../../storybook/reader/StoryBookReader";
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
import { STORY_LANGUAGES } from "../constants";
import type { StorefrontTemplate, StoryTemplate } from "@/data/story-templates";
import { CARTOON_ART_STYLES, DEFAULT_ART_STYLE, getArtStyle } from "../../../services/fal/cartoonGeneration";
import { CreationMagicAnimation } from "./CreationMagicAnimation";

const STEPS = [
  { title: "Your Hero", description: "Photo, name, age & gender", icon: User },
  { title: "Your Story", description: "Story, language & dedication", icon: BookOpen },
  { title: "Art Style", description: "Choose the look and feel", icon: Palette },
  { title: "Review", description: "Create your story", icon: Sparkles },
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
  pdfUrl?: string;
  pages: StoryPageData[];
}

/** A predefined template as returned by GET /storybook/templates. */
type TemplateOption = StorefrontTemplate;

/**
 * The bits of the shelf-picked template the wizard needs before the server list
 * loads. Resolved server-side by the create page, which reads the catalogue from
 * the database.
 */
type ShelfTemplate = Pick<
  StoryTemplate,
  "title" | "tagline" | "ageRange" | "coverImage"
>;

export interface StoryGeneratorProps {
  /** The template named by `?templateId=`, looked up in the database. */
  shelfTemplate?: ShelfTemplate | null;
}

export function StoryGenerator({ shelfTemplate = null }: StoryGeneratorProps = {}) {
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
  // A photo tells the illustrator who the hero is; the gender tells the writer
  // which pronouns and details to use for that same hero.
  const [childGender, setChildGender] = useState<"" | "boy" | "girl">("");
  const [childImage, setChildImage] = useState<string | null>(null);
  const [childImagePreview, setChildImagePreview] = useState<string | null>(null);
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [customMode, setCustomMode] = useState(false);
  const [customIdea, setCustomIdea] = useState("");
  const [customSetting, setCustomSetting] = useState("");
  const [customExtras, setCustomExtras] = useState("");
  const [customMessage, setCustomMessage] = useState("");
  const [storyLanguage, setStoryLanguage] = useState<"english" | "french" | "arabic">("english");
  const [artStyle, setArtStyle] = useState(DEFAULT_ART_STYLE);
  const [dedication, setDedication] = useState("");

  // A custom idea is turned into a real template first, so the generation call
  // always carries a templateId and both paths share one flow.
  const [customTemplateId, setCustomTemplateId] = useState<string | null>(null);
  const [customTemplateName, setCustomTemplateName] = useState<string>("");
  const [customTemplateLoading, setCustomTemplateLoading] = useState(false);
  const [customTemplateError, setCustomTemplateError] = useState<string | null>(null);

  /** The story picked on the shelf: the wizard is opened with ?templateId=... */
  const shelfTemplateId = (searchParams?.get("templateId") ?? "").trim();
  const customFromUrl = !!searchParams?.get("custom");

  const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);
  /**
   * The shelf choice, resolved from the database by the create page, so the
   * wizard can name the story the parent picked even before the server list
   * has loaded.
   */
  const shelfStory = shelfTemplateId ? (shelfTemplate ?? undefined) : undefined;
  /**
   * The server list is authoritative for generation. When the shelf story is
   * missing from it we say so and stop, instead of quietly generating a
   * different book than the one that was chosen.
   */
  const shelfStoryMissing =
    templates.length > 0 &&
    !!shelfTemplateId &&
    !templates.some((t) => t.id === shelfTemplateId);

  const storyName = customMode
    ? customTemplateName || "Your own story"
    : selectedTemplate?.title || shelfStory?.title || "";
  const storyDescription = selectedTemplate?.description || shelfStory?.tagline || "";
  const storyAgeRange = selectedTemplate?.ageRange || shelfStory?.ageRange || "";

  // Open straight into "My Own Story" via ?custom=1
  useEffect(() => {
    if (!customFromUrl) return;
    setCustomMode(true);
    setCustomTemplateId(null);
    setStep((current) => (current === 0 ? 1 : current));
  }, [customFromUrl]);

  // The story picked on the shelf always wins while the wizard is open.
  useEffect(() => {
    if (!shelfTemplateId) return;
    setCustomMode(false);
    setSelectedTemplateId(shelfTemplateId);
  }, [shelfTemplateId]);

  // The database is the source of truth for the template list.
  useEffect(() => {
    let cancelled = false;

    axios
      .get<{ templates: TemplateOption[] }>(`${BACKEND_URL}/storybook/templates`)
      .then((response) => {
        if (cancelled) return;
        const list = response.data?.templates ?? [];
        setTemplates(list);
        // Never swap a shelf choice for another story: only visitors who
        // opened the wizard without picking a book get a default.
        setSelectedTemplateId((current) => current || list[0]?.id || "");
      })
      .catch(() => {
        if (!cancelled) {
          setTemplates([]);
          setError("We couldn't load the story templates. Please refresh and try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /** Turn the parent's idea into a stored custom template. */
  const createCustomTemplate = async (): Promise<string | null> => {
    const idea = customIdea.trim();
    if (idea.length < 3) {
      setCustomTemplateError("Tell us a little about your story first.");
      return null;
    }

    setCustomTemplateLoading(true);
    setCustomTemplateError(null);

    try {
      const token = await getToken?.();
      const ageRange = childAge <= 5 ? "3-5" : childAge <= 8 ? "6-8" : "9-12";

      const response = await axios.post(
        `${BACKEND_URL}/storybook/templates/custom`,
        {
          idea,
          setting: customSetting.trim() || undefined,
          extras: customExtras.trim() || undefined,
          message: customMessage.trim() || undefined,
          ageRange,
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const template: TemplateOption = response.data?.template;
      if (!template?.id) {
        setCustomTemplateError("We couldn't build that story yet. Please try again.");
        return null;
      }

      setCustomTemplateId(template.id);
      setCustomTemplateName(template.title);
      return template.id;
    } catch (err) {
      console.error("Custom template creation failed", err);
      const errorResponse = err instanceof AxiosError ? err.response : undefined;
      setCustomTemplateError(
        (errorResponse?.data as { message?: string } | undefined)?.message ||
        "We couldn't build that story yet. Please try again."
      );
      return null;
    } finally {
      setCustomTemplateLoading(false);
    }
  };


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
    // Custom stories become a real template first, so the generation request
    // always carries a templateId and both paths converge on one flow.
    const templateId = customMode
      ? customTemplateId ?? (await createCustomTemplate())
      : selectedTemplateId;

    if (!childName.trim() || !templateId) {
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
          childName: childName.trim(),
          childAge,
          gender: childGender || undefined,
          templateId,
          language: storyLanguage,
          artStyle,
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
      case 0: return !!childName.trim() && !!childImage && !!childGender;
      case 1:
        // A story the server cannot serve must never be replaced by another one.
        if (shelfStoryMissing) return false;
        return customMode ? !!customIdea.trim() : !!selectedTemplateId;
      case 2: return !!artStyle;
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

  // Teaser after generation: the book preview is capped at the first 2 pages,
  // and flipping past them surfaces the "Order now" call to action.
  if (generatedStory) {
    return (
      <div className="mx-auto max-w-5xl space-y-8 px-1 pb-12 sm:px-0">
        {/* Celebration Header */}
        <Card className="relative overflow-hidden rounded-3xl border-buttercup/30 bg-gradient-to-b from-buttercup/15 via-white to-blush/40 p-4 text-center shadow-xl sm:p-8">
          <motion.span aria-hidden className="absolute left-[16%] top-8 text-2xl text-buttercup" animate={{ y: [0, -9, 0], rotate: [0, 16, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }}>✦</motion.span>
          <motion.span aria-hidden className="absolute right-[16%] top-12 text-xl text-primary" animate={{ y: [0, 8, 0], rotate: [0, -16, 0], opacity: [0.4, 1, 0.4] }} transition={{ duration: 2.1, repeat: Infinity, delay: 0.2 }}>✦</motion.span>
          <motion.div
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", bounce: 0.55 }}
            className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-primary to-violet-deep text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-primary/20"
          >
            <Sparkles className="w-8 h-8" />
          </motion.div>
          <h2 className="text-3xl sm:text-4xl font-display font-bold text-violet-deep mb-2">
            {generatedStory.title} is Ready! 🎉
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto text-sm sm:text-base">
            Here is an exclusive preview of the first 2 pages of <strong>{generatedStory.childName}&apos;s</strong> adventure book.
          </p>
        </Card>

        {/* Book preview — first 2 pages, then the reader's "Order now" gate */}
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-xl font-display font-bold text-violet-deep flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary" /> Book Preview
            </h3>
            <span className="text-xs font-semibold px-3 py-1 bg-buttercup/20 text-violet-deep rounded-full">
              First 2 of {generatedStory.pages.length} pages
            </span>
          </div>

          <div className="overflow-hidden rounded-3xl border border-border shadow-xl">
            <StoryBookReader
              storyId={generatedStory.storyId}
              previewLimit={3}
              embedded
            />
          </div>
        </div>

        {/* Action CTA Banner */}
        <Card className="rounded-3xl border-purple-500/20 bg-gradient-to-r from-violet-deep via-violet-ink to-violet-deep p-4 text-white shadow-2xl sm:p-8">
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

  if (loading) {
    return <CreationMagicAnimation heroName={childName.trim() || undefined} />;
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
          <Card className="overflow-hidden border-border p-4 shadow-xl sm:p-8">
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
                <h2 className="font-display text-2xl font-bold text-violet-deep sm:text-3xl">Who is the Hero?</h2>
                <p className="text-muted-foreground mt-2">Use one clear, front-facing photo so the hero stays recognizable on every page.</p>
              </div>

              {/* Photo upload */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`cursor-pointer rounded-2xl border-2 border-dashed p-4 text-center transition-colors sm:p-8 ${childImagePreview
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

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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

              <div>
                <Label>
                  Hero&apos;s Gender <span className="text-red-500 font-bold">*</span>
                </Label>
                <div className="mt-1 grid grid-cols-2 gap-3">
                  {(["girl", "boy"] as const).map((option) => (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={childGender === option}
                      onClick={() => setChildGender(option)}
                      className={`rounded-xl border-2 px-4 py-3 text-sm font-bold capitalize transition-all ${childGender === option
                        ? "border-primary bg-buttercup/20 text-violet-deep"
                        : "border-border text-muted-foreground hover:border-primary/60"
                        }`}
                    >
                      {option}
                    </button>
                  ))}
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">
                  Keeps the story&apos;s hero, pronouns and illustrations consistent with your child.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 1: Story details - the story itself was chosen on the shelf */}
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center mb-8">
                <h2 className="font-display text-2xl font-bold text-violet-deep sm:text-3xl">
                  {customMode ? "Tell us your story" : "Make it yours"}
                </h2>
                <p className="text-muted-foreground mt-2">
                  {customMode
                    ? "Describe the story you want and we will build it around your hero."
                    : "Your story is already picked - add the language and dedication for your hero."}
                </p>
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
                      onChange={(e) => { setCustomIdea(e.target.value); setCustomTemplateId(null); }}
                      placeholder="e.g., Leo visits grandma's bakery and secretly helps save the day when the oven breaks before the town festival..."
                      className="min-h-28"
                    />
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Setting <span className="text-muted-foreground">(optional)</span></Label>
                      <Input
                        value={customSetting}
                        onChange={(e) => { setCustomSetting(e.target.value); setCustomTemplateId(null); }}
                        placeholder="e.g., A snowy mountain village"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Extras to include <span className="text-muted-foreground">(optional)</span></Label>
                      <Input
                        value={customExtras}
                        onChange={(e) => { setCustomExtras(e.target.value); setCustomTemplateId(null); }}
                        placeholder="e.g., A fluffy rabbit, a magic sleigh"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>A message to teach <span className="text-muted-foreground">(optional)</span></Label>
                    <Input
                      value={customMessage}
                      onChange={(e) => { setCustomMessage(e.target.value); setCustomTemplateId(null); }}
                      placeholder="e.g., Helping others makes us braver"
                    />
                  </div>

                  {customTemplateId && (
                    <div className="flex items-start gap-3 bg-emerald-50 text-emerald-800 p-4 rounded-xl text-sm">
                      <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <p>
                        Your story is ready: <strong>{customTemplateName || "Your custom story"}</strong>.
                        Edit your idea above to rebuild it.
                      </p>
                    </div>
                  )}

                  {customTemplateError && (
                    <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm">{customTemplateError}</div>
                  )}

                  <Button
                    type="button"
                    onClick={createCustomTemplate}
                    disabled={customTemplateLoading || customIdea.trim().length < 3}
                    className="w-full bg-white text-violet-deep border border-border hover:bg-buttercup/10"
                  >
                    {customTemplateLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Writing your story...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        {customTemplateId ? "Rebuild my story" : "Turn my idea into a story"}
                      </>
                    )}
                  </Button>
                </motion.div>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-2xl border border-border bg-muted/30 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        {shelfStory && (
                          <img
                            src={shelfStory.coverImage}
                            alt=""
                            aria-hidden
                            loading="lazy"
                            decoding="async"
                            className="hidden size-20 shrink-0 rounded-xl object-cover ring-1 ring-border sm:block"
                          />
                        )}
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">
                            Your chosen story
                          </p>
                          <h3 className="mt-1 font-display text-lg font-bold text-violet-deep">
                            {storyName || "Loading your story..."}
                          </h3>
                          {storyDescription && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {storyDescription}
                            </p>
                          )}
                        </div>
                      </div>
                      {storyAgeRange && (
                        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-muted-foreground">
                          Ages {storyAgeRange}
                        </span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm font-semibold text-primary">
                      <Link href="/books" className="hover:underline">
                        Choose a different story
                      </Link>
                      {shelfTemplateId && (
                        <Link href={`/books/${shelfTemplateId}`} className="hover:underline">
                          Read the story details
                        </Link>
                      )}
                      <Link href="/create-custom" className="hover:underline">
                        Write your own story
                      </Link>
                    </div>
                  </div>

                  {shelfStoryMissing && (
                    <div className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="font-bold">
                          {shelfStory?.title ?? shelfTemplateId} is not available on the server yet.
                        </p>
                        <p>
                          We will not replace it with a different story. Pick another book,
                          or ask the admin to re-seed the story templates
                          (<span className="font-mono">npm run seed:templates</span>) and reload
                          this page.
                        </p>
                        <Link href="/books" className="inline-block font-bold text-primary hover:underline">
                          Pick another story
                        </Link>
                      </div>
                    </div>
                  )}
                </div>
              )}

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

          {/* Step 2: Art style */}
          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="mb-8 text-center">
                <h2 className="font-display text-2xl font-bold text-violet-deep sm:text-3xl">
                  Choose your story&apos;s art style
                </h2>
                <p className="mx-auto mt-2 max-w-2xl text-muted-foreground">
                  Pick the visual world your hero will live in. These examples show the same fictional 7-year-old Tunisian hero in every style.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                {CARTOON_ART_STYLES.map((style) => {
                  const selected = artStyle === style.id;
                  return (
                    <button
                      key={style.id}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => setArtStyle(style.id)}
                      className={`group overflow-hidden rounded-2xl border-2 bg-white text-left transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${selected
                        ? "border-primary shadow-lg shadow-primary/15 ring-4 ring-primary/10"
                        : "border-border hover:border-primary/50"
                        }`}
                    >
                      <div className="relative aspect-square overflow-hidden bg-muted">
                        <Image
                          src={style.image}
                          alt={`${style.name} example with a fictional 7-year-old Tunisian boy`}
                          fill
                          sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 220px"
                          className="object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {selected && (
                          <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-primary text-white shadow-md">
                            <CheckCircle2 className="size-5" aria-hidden />
                          </span>
                        )}
                      </div>
                      <div className="p-3">
                        <p className="font-display text-sm font-bold text-violet-deep sm:text-base">
                          {style.emoji} {style.name}
                        </p>
                        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                          {style.description}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 rounded-2xl bg-buttercup/10 p-4 text-sm text-violet-deep">
                <Palette className="size-5 shrink-0 text-primary" aria-hidden />
                <p>
                  Selected style: <strong>{getArtStyle(artStyle).name}</strong>. You can change it before creating your book.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 3: Generate */}
          {step === 3 && (
            <motion.div
              key="step3"
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
              <div className="space-y-4 rounded-2xl bg-gradient-to-br from-buttercup/15 to-blush/40 p-4 sm:p-6">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Hero</span>
                    <p className="font-medium text-violet-deep text-lg">
                      {childName}, age {childAge}
                      {childGender ? ` (${childGender})` : ""}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Story</span>
                    <p className="font-medium text-violet-deep">{storyName || "—"}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Language</span>
                    <p className="font-medium text-violet-deep">{STORY_LANGUAGES.find((l) => l.value === storyLanguage)?.label}</p>
                  </div>
                  <div>
                    <span className="text-xs uppercase tracking-wide text-muted-foreground">Art Style</span>
                    <div className="mt-1 flex items-center gap-2">
                      <Image
                        src={getArtStyle(artStyle).image}
                        alt=""
                        width={40}
                        height={40}
                        className="size-10 rounded-lg object-cover ring-1 ring-border"
                      />
                      <p className="font-medium text-violet-deep">{getArtStyle(artStyle).emoji} {getArtStyle(artStyle).name}</p>
                    </div>
                  </div>
                  {dedication.trim() && (
                    <div className="sm:col-span-2">
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
                  Generation takes about <strong>7 minutes</strong>.
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
