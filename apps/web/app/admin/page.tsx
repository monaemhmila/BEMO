"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import axios from "axios";
import { BACKEND_URL } from "../config";
import { useState, useEffect, useCallback } from "react";
import {
  Users, BookOpen, Sparkles, Coins, ShieldCheck, RefreshCw, Gift, Search,
  Trash2, Play, CheckCircle2, HardDrive, Cpu, Key, TrendingUp, Activity,
  UserX, Eye, Clock,
  BarChart3, Zap, ArrowUpRight, Download,
  X, UserCheck, FileText,
  PencilLine, ScanFace, Save, Upload,
  ShoppingBag, Truck, Package, MapPin,
} from "lucide-react";
import toast, { Toaster } from "react-hot-toast";
import { handleImageError } from "../../components/ui/image-fallback";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AdminStats {
  totalUsers: number;
  totalStories: number;
  totalModels: number;
  totalCreditsIssued: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  storiesThisWeek: number;
  modelsThisWeek: number;
  pendingModels: number;
  completedStories: number;
  generatingStories: number;
}

interface AdminUser {
  id: string;
  clerkId: string;
  email: string;
  name: string;
  credits: number;
  modelCount: number;
  storyCount: number;
  models: { id: string; name: string; trainingStatus: string; createdAt: string; thumbnail?: string }[];
  stories: { id: string; title: string; status: string; pdfUrl?: string | null; createdAt: string; category?: string }[];
  createdAt: string;
}

interface AdminStory {
  id: string;
  title: string;
  status: string;
  category?: string;
  childName?: string;
  pdfUrl?: string | null;
  createdAt: string;
  user?: { id: string; email: string; name: string };
  pages: { id: string; pageNumber: number; status: string; imageUrl?: string }[];
  model?: { name: string; thumbnail?: string };
}

interface AdminModel {
  id: string;
  name: string;
  trainingStatus: string;
  tensorPath?: string;
  thumbnail?: string;
  age?: number;
  type?: string;
  createdAt: string;
  user?: { id: string; email: string; name: string };
  stories: { id: string }[];
}

interface ActivityItem {
  type: "user_joined" | "story_created" | "model_trained";
  id: string;
  label: string;
  userEmail?: string;
  status?: string;
  time: string;
}

interface FaceLabDetection {
  found: boolean;
  box?: { x: number; y: number; width: number; height: number };
  score?: number;
  imageSize?: { width: number; height: number };
}

interface FaceLabResult {
  detection: FaceLabDetection;
  references: { center: string; right: string; left: string };
}

interface AdminOrder {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  totalAmount: number;
  currency: string;
  customerName: string;
  phone: string;
  address: string;
  city: string;
  postalCode?: string | null;
  createdAt: string;
  updatedAt: string;
  user: { id: string; email: string; name?: string | null };
  story: { id: string; title: string; childName?: string | null };
}

interface OrdersSummary {
  PENDING: number;
  PROCESSING: number;
  SHIPPED: number;
  DELIVERED: number;
  CANCELLED: number;
}

type TabType = "overview" | "users" | "stories" | "facelab" | "orders" | "models" | "activity";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Completed: "bg-emerald-100 text-emerald-800",
    Generated: "bg-emerald-100 text-emerald-800",
    Generating: "bg-amber-100 text-amber-800",
    Pending: "bg-amber-100 text-amber-800",
    Failed: "bg-red-100 text-red-800",
    Processing: "bg-blue-100 text-blue-800",
  };
  const cls = map[status] ?? "bg-stone-100 text-stone-700";
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${cls} ${status === "Generating" || status === "Pending" ? "animate-pulse" : ""}`}>
      {status}
    </span>
  );
}

// ─── Credit Editor ───────────────────────────────────────────────────────────

function CreditEditor({ user, onSave, onClose }: { user: AdminUser; onSave: (id: string, amount: number, action: string) => void; onClose: () => void }) {
  const [amount, setAmount] = useState(0);
  const [action, setAction] = useState<"add" | "subtract" | "set">("add");

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">Adjust Credits</h3>
            <p className="text-stone-500 text-sm">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl"><X className="w-5 h-5 text-stone-500" /></button>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Coins className="w-6 h-6 text-amber-600" />
          <div>
            <p className="text-xs text-amber-600 font-medium uppercase tracking-wide">Current Balance</p>
            <p className="text-2xl font-bold text-amber-700">{user.credits.toLocaleString()} credits</p>
          </div>
        </div>

        <div className="flex gap-2">
          {(["add", "subtract", "set"] as const).map((a) => (
            <button
              key={a}
              onClick={() => setAction(a)}
              className={`flex-1 py-2 rounded-xl text-sm font-semibold capitalize border transition-all ${action === a ? "bg-purple-600 text-white border-purple-600" : "bg-white text-stone-600 border-stone-200 hover:border-purple-400"}`}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-stone-700">Amount</label>
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="flex-1 px-4 py-2.5 border border-stone-200 rounded-xl text-lg font-bold focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="0"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            {[50, 100, 200, 500, 1000].map((v) => (
              <button key={v} onClick={() => setAmount(v)} className="px-3 py-1 bg-stone-100 hover:bg-purple-100 text-stone-700 hover:text-purple-700 rounded-lg text-xs font-semibold transition-colors">
                {v.toLocaleString()}
              </button>
            ))}
          </div>
        </div>

        {action !== "set" && (
          <div className="bg-stone-50 rounded-xl p-3 text-sm text-stone-600">
            New balance will be:{" "}
            <strong className="text-stone-900">
              {action === "add" ? user.credits + amount : Math.max(0, user.credits - amount)} credits
            </strong>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button onClick={onClose} className="flex-1 py-2.5 border border-stone-200 rounded-xl text-stone-600 font-medium hover:bg-stone-50 transition-colors">
            Cancel
          </button>
          <button
            onClick={() => { onSave(user.id, amount, action); onClose(); }}
            disabled={amount <= 0}
            className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl font-semibold transition-colors disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── User Detail Drawer ───────────────────────────────────────────────────────

function UserDrawer({ user, onClose, onDeleteUser, onEditCredits }: { user: AdminUser; onClose: () => void; onDeleteUser: (id: string) => void; onEditCredits: (user: AdminUser) => void }) {
  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 flex justify-end" onClick={onClose}>
      <div className="w-full max-w-lg bg-white h-full shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b border-stone-100 p-5 flex items-center justify-between z-10">
          <div>
            <h3 className="font-bold text-stone-900 text-lg">{user.name || user.email}</h3>
            <p className="text-stone-500 text-sm">{user.email}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onEditCredits(user)} className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-xs font-semibold hover:bg-amber-200 transition-colors">
              Edit Credits
            </button>
            <button onClick={onClose} className="p-2 hover:bg-stone-100 rounded-xl">
              <X className="w-5 h-5 text-stone-500" />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-6">
          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-amber-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-amber-700">{user.credits.toLocaleString()}</p>
              <p className="text-xs text-amber-600 font-medium">Credits</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-700">{user.modelCount}</p>
              <p className="text-xs text-purple-600 font-medium">Models</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-700">{user.storyCount}</p>
              <p className="text-xs text-blue-600 font-medium">Stories</p>
            </div>
          </div>

          <div className="text-xs text-stone-400">
            Joined {new Date(user.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · ID: <code className="bg-stone-100 px-1 rounded">{user.id}</code>
          </div>

          {/* Models */}
          {user.models.length > 0 && (
            <div>
              <h4 className="font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-500" /> AI Models ({user.models.length})
              </h4>
              <div className="space-y-2">
                {user.models.map((m) => (
                  <div key={m.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <div>
                      <p className="font-medium text-stone-900 text-sm">{m.name}</p>
                      <p className="text-xs text-stone-400">{timeAgo(m.createdAt)}</p>
                    </div>
                    <StatusBadge status={m.trainingStatus} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Stories */}
          {user.stories.length > 0 && (
            <div>
              <h4 className="font-semibold text-stone-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-blue-500" /> Stories ({user.stories.length})
              </h4>
              <div className="space-y-2">
                {user.stories.map((s) => {
                  const pdfLink = s.pdfUrl
                    ? (s.pdfUrl.startsWith("http") ? s.pdfUrl : `${BACKEND_URL}${s.pdfUrl}`)
                    : `${BACKEND_URL}/admin/story/${s.id}/pdf`;
                  return (
                    <div key={s.id} className="flex items-center justify-between p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <div>
                        <p className="font-medium text-stone-900 text-sm">{s.title}</p>
                        <p className="text-xs text-stone-400">{timeAgo(s.createdAt)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={s.status} />
                        <a
                          href={pdfLink}
                          target="_blank"
                          rel="noreferrer"
                          download
                          className="px-2 py-1 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 rounded-lg text-xs font-semibold flex items-center gap-1 transition-colors"
                          title="Download Full Story PDF"
                        >
                          <Download className="w-3 h-3" /> PDF
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Delete */}
          <div className="pt-4 border-t border-stone-100">
            <button
              onClick={() => { if (confirm(`Permanently delete ${user.email} and ALL their data?`)) { onDeleteUser(user.id); onClose(); } }}
              className="w-full py-2.5 border border-red-200 text-red-600 hover:bg-red-50 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
            >
              <UserX className="w-4 h-4" /> Delete User & All Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Face Lab (detection test + canvas downloads) ────────────────────────────

/** Downscale an uploaded photo client-side so the admin request stays small. */
async function fileToDataUrl(file: File, maxSize = 1024, quality = 0.85): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported in this browser");
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return canvas.toDataURL("image/jpeg", quality);
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function FaceLabTab({ authHeaders }: { authHeaders: () => Promise<Record<string, string>> }) {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [sourceName, setSourceName] = useState("");
  const [result, setResult] = useState<FaceLabResult | null>(null);
  const [loading, setLoading] = useState(false);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await fileToDataUrl(file);
      setSourceImage(dataUrl);
      setSourceName(file.name);
      setResult(null);
    } catch {
      toast.error("Could not read that image file");
    }
  };

  const runDetection = async () => {
    if (!sourceImage) return;
    setLoading(true);
    try {
      const headers = await authHeaders();
      const res = await axios.post(
        `${BACKEND_URL}/admin/face-lab`,
        { image: sourceImage },
        { headers }
      );
      setResult(res.data);
      toast.success(
        res.data.detection.found
          ? "Face detected!"
          : "No face found — canvases use the full image"
      );
    } catch {
      toast.error("Face lab request failed");
    } finally {
      setLoading(false);
    }
  };

  const cards = result
    ? [
        { label: "Left (25%)", hint: "pages with the character on the left", dataUrl: result.references.left, filename: "face-left-canvas.jpg", accent: "bg-purple-500/20 text-purple-400" },
        { label: "Center (50%)", hint: "cover page", dataUrl: result.references.center, filename: "face-center-canvas.jpg", accent: "bg-blue-500/20 text-blue-400" },
        { label: "Right (75%)", hint: "pages with the character on the right", dataUrl: result.references.right, filename: "face-right-canvas.jpg", accent: "bg-emerald-500/20 text-emerald-400" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Upload + run */}
      <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
        <h3 className="font-semibold text-white mb-1">Test Face Detection</h3>
        <p className="text-white/40 text-xs mb-4">
          Upload a child photo — detection runs locally (tiny face detector), then the face is placed on a white
          canvas at the left (25%), center (50%) and right (75%) positions. No image API is called.
        </p>
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <label className="cursor-pointer inline-flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white rounded-xl text-sm font-semibold transition-colors">
            <Upload className="w-4 h-4" />
            {sourceName || "Choose Photo"}
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }}
            />
          </label>
          <button
            onClick={runDetection}
            disabled={!sourceImage || loading}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors"
          >
            <ScanFace className={`w-4 h-4 ${loading ? "animate-pulse" : ""}`} />
            {loading ? "Detecting..." : "Run Detection"}
          </button>
          {sourceImage && (
            <img src={sourceImage} alt="Uploaded source" className="w-14 h-14 rounded-xl object-cover border border-white/10" />
          )}
        </div>
      </div>

      {/* Detection report */}
      {result && (
        <div className={`rounded-2xl border p-5 ${result.detection.found ? "bg-emerald-500/5 border-emerald-500/20" : "bg-amber-500/5 border-amber-500/20"}`}>
          <div className="flex items-center gap-3">
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${result.detection.found ? "bg-emerald-500/20 text-emerald-400" : "bg-amber-500/20 text-amber-400"}`}>
              {result.detection.found ? <CheckCircle2 className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-white text-sm">
                {result.detection.found
                  ? "Face detected"
                  : "No face detected — canvases use the full image"}
              </p>
              {result.detection.found && result.detection.box && result.detection.imageSize && (
                <p className="text-white/40 text-xs mt-0.5">
                  score {((result.detection.score ?? 0) * 100).toFixed(1)}% · box
                  ({Math.round(result.detection.box.x)}, {Math.round(result.detection.box.y)})
                  {Math.round(result.detection.box.width)}×{Math.round(result.detection.box.height)}px
                  · source {result.detection.imageSize.width}×{result.detection.imageSize.height}px
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Positioned canvases with downloads */}
      {result && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {cards.map((card) => (
            <div key={card.label} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden flex flex-col">
              <div className="p-4">
                <p className="font-semibold text-white text-sm flex items-center gap-2">
                  <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${card.accent}`}>
                    {card.label[0]}
                  </span>
                  {card.label}
                </p>
                <p className="text-white/30 text-xs mt-0.5">{card.hint}</p>
              </div>
              <img src={card.dataUrl} alt={card.label} className="w-full aspect-video object-contain bg-white" />
              <div className="p-3 border-t border-white/5 mt-auto">
                <button
                  onClick={() => downloadDataUrl(card.dataUrl, card.filename)}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 rounded-xl text-xs font-semibold transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  Download {card.label.split(" ")[0]} Canvas
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Story Editor ─────────────────────────────────────────────────────────────

const STORY_STATUSES = ["Pending", "Generating", "Completed", "Failed", "Processing"];
const PAGE_STATUSES = ["Pending", "Generated", "Failed"];
const STORY_CATEGORIES = ["bedtime", "adventure", "friendship", "learning", "animals", "fantasy", "moral", "seasonal", "science", "history", "emotions", "family"];
const STORY_LENGTHS = ["short", "medium", "long", "extended"];

const adminInputCls = "w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500";

interface EditorStory {
  id: string;
  title: string;
  status: string;
  category?: string;
  childName?: string | null;
  childAge?: number | null;
  dedication?: string | null;
  storyLength?: string;
  isPublic?: boolean;
  user?: { email?: string | null; name?: string | null } | null;
}

interface EditorPage {
  id: string;
  pageNumber: number;
  content: string;
  imagePrompt: string;
  imageUrl?: string | null;
  audioUrl?: string | null;
  status: string;
}

function StoryEditor({ storyId, authHeaders, onClose, onChanged }: {
  storyId: string;
  authHeaders: () => Promise<Record<string, string>>;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [story, setStory] = useState<EditorStory | null>(null);
  const [pages, setPages] = useState<EditorPage[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const headers = await authHeaders();
        const res = await axios.get(`${BACKEND_URL}/admin/story/${storyId}`, { headers });
        if (cancelled) return;
        setStory(res.data.story);
        setPages(res.data.story?.pages ?? []);
      } catch {
        if (!cancelled) setFailed(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [storyId, authHeaders]);

  const patchPage = (id: string, patch: Partial<EditorPage>) =>
    setPages((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const saveMeta = async () => {
    if (!story) return;
    setSaving("meta");
    try {
      const headers = await authHeaders();
      await axios.put(
        `${BACKEND_URL}/admin/story/${story.id}`,
        {
          title: story.title,
          childName: story.childName || undefined,
          childAge: story.childAge ?? undefined,
          category: story.category,
          status: story.status,
          dedication: story.dedication || undefined,
          storyLength: story.storyLength,
          isPublic: !!story.isPublic,
        },
        { headers }
      );
      toast.success("Story details saved");
      onChanged();
    } catch {
      toast.error("Failed to save story details");
    } finally {
      setSaving("");
    }
  };

  const savePage = async (page: EditorPage) => {
    setSaving(page.id);
    try {
      const headers = await authHeaders();
      await axios.put(
        `${BACKEND_URL}/admin/page/${page.id}`,
        {
          content: page.content,
          imagePrompt: page.imagePrompt,
          imageUrl: page.imageUrl || null,
          audioUrl: page.audioUrl || null,
          status: page.status,
          pageNumber: page.pageNumber,
        },
        { headers }
      );
      toast.success(`Page ${page.pageNumber} saved`);
      onChanged();
    } catch {
      toast.error(`Failed to save page ${page.pageNumber}`);
    } finally {
      setSaving("");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-[#17171a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-4xl h-[92vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0f0f11]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-white text-base">Story Editor</h3>
              <p className="text-white/40 text-xs truncate">
                {story ? `${story.title} · ${story.user?.email ?? "unknown user"}` : "Loading..."}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl">
            <X className="w-5 h-5 text-white/50" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && <p className="text-white/40 text-sm">Loading story…</p>}
          {failed && <p className="text-red-400 text-sm">Failed to load this story. It may have been deleted.</p>}

          {story && !loading && (
            <>
              {/* Story details */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold text-white text-sm">Story Details</h4>
                  <button
                    onClick={saveMeta}
                    disabled={saving === "meta"}
                    className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-40 text-white rounded-lg text-xs font-semibold transition-colors"
                  >
                    <Save className={`w-3.5 h-3.5 ${saving === "meta" ? "animate-pulse" : ""}`} />
                    {saving === "meta" ? "Saving..." : "Save Details"}
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Title</label>
                    <input className={adminInputCls} value={story.title} onChange={(e) => setStory({ ...story, title: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Child Name</label>
                    <input className={adminInputCls} value={story.childName ?? ""} onChange={(e) => setStory({ ...story, childName: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Child Age</label>
                    <input
                      type="number" min={0} max={21} className={adminInputCls}
                      value={story.childAge ?? ""}
                      onChange={(e) => setStory({ ...story, childAge: e.target.value === "" ? null : parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Category</label>
                    <select className={adminInputCls} value={story.category ?? "adventure"} onChange={(e) => setStory({ ...story, category: e.target.value })}>
                      {STORY_CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#17171a]">{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Status</label>
                    <select className={adminInputCls} value={story.status} onChange={(e) => setStory({ ...story, status: e.target.value })}>
                      {STORY_STATUSES.map((s) => <option key={s} value={s} className="bg-[#17171a]">{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs text-white/40 mb-1 block">Story Length</label>
                    <select className={adminInputCls} value={story.storyLength ?? "medium"} onChange={(e) => setStory({ ...story, storyLength: e.target.value })}>
                      {STORY_LENGTHS.map((l) => <option key={l} value={l} className="bg-[#17171a]">{l}</option>)}
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-xs text-white/40 mb-1 block">Dedication</label>
                    <textarea rows={2} className={adminInputCls} value={story.dedication ?? ""} onChange={(e) => setStory({ ...story, dedication: e.target.value })} />
                  </div>
                  <label className="flex items-center gap-2 text-sm text-white/60">
                    <input
                      type="checkbox"
                      checked={!!story.isPublic}
                      onChange={(e) => setStory({ ...story, isPublic: e.target.checked })}
                      className="w-4 h-4 accent-purple-500"
                    />
                    Public / shared story
                  </label>
                </div>
              </div>

              {/* Pages */}
              <div className="space-y-4">
                <h4 className="font-semibold text-white/60 text-xs uppercase tracking-wider">Pages ({pages.length})</h4>
                {pages.map((page) => (
                  <div key={page.id} className="bg-white/5 border border-white/10 rounded-2xl p-5 space-y-3">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {page.pageNumber}
                        </div>
                        <select
                          className="px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          value={page.status}
                          onChange={(e) => patchPage(page.id, { status: e.target.value })}
                        >
                          {PAGE_STATUSES.map((s) => <option key={s} value={s} className="bg-[#17171a]">{s}</option>)}
                        </select>
                        <input
                          type="number" min={1} max={64}
                          value={page.pageNumber}
                          onChange={(e) => patchPage(page.id, { pageNumber: parseInt(e.target.value) || 1 })}
                          className="w-16 px-2 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                          title="Page number"
                        />
                      </div>
                      <button
                        onClick={() => savePage(page)}
                        disabled={saving === page.id}
                        className="inline-flex items-center gap-2 px-3 py-1.5 bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 disabled:opacity-40 rounded-lg text-xs font-semibold transition-colors"
                      >
                        <Save className={`w-3.5 h-3.5 ${saving === page.id ? "animate-pulse" : ""}`} />
                        {saving === page.id ? "Saving..." : "Save Page"}
                      </button>
                    </div>

                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Page Text</label>
                      <textarea rows={3} className={adminInputCls} value={page.content} onChange={(e) => patchPage(page.id, { content: e.target.value })} />
                    </div>

                    <div>
                      <label className="text-xs text-white/40 mb-1 block">Image Prompt</label>
                      <textarea rows={2} className={adminInputCls} value={page.imagePrompt} onChange={(e) => patchPage(page.id, { imagePrompt: e.target.value })} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Image URL</label>
                        <input className={adminInputCls} value={page.imageUrl ?? ""} onChange={(e) => patchPage(page.id, { imageUrl: e.target.value })} placeholder="/assets/..." />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 mb-1 block">Audio URL</label>
                        <input className={adminInputCls} value={page.audioUrl ?? ""} onChange={(e) => patchPage(page.id, { audioUrl: e.target.value })} />
                      </div>
                    </div>

                    {page.imageUrl && (
                      <img
                        src={page.imageUrl.startsWith("/") ? `${BACKEND_URL}${page.imageUrl}` : page.imageUrl}
                        alt={`Page ${page.pageNumber}`}
                        onError={handleImageError}
                        className="w-40 rounded-xl border border-white/10"
                      />
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Orders Management ────────────────────────────────────────────────────────

const ORDER_FLOW = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

function OrderStatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-amber-500/20 text-amber-400",
    PROCESSING: "bg-blue-500/20 text-blue-400",
    SHIPPED: "bg-purple-500/20 text-purple-400",
    DELIVERED: "bg-emerald-500/20 text-emerald-400",
    CANCELLED: "bg-red-500/20 text-red-400",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${map[status] ?? "bg-white/10 text-white/60"}`}>
      {status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING: "bg-stone-500/20 text-stone-300",
    PAID: "bg-emerald-500/20 text-emerald-400",
    FAILED: "bg-red-500/20 text-red-400",
    REFUNDED: "bg-blue-500/20 text-blue-400",
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${map[status] ?? "bg-white/10 text-white/60"}`}>
      {status === "PAID" ? "PAID ✓" : status}
    </span>
  );
}

function OrdersTab({ orders, summary, authHeaders, onChanged }: {
  orders: AdminOrder[];
  summary: OrdersSummary | null;
  authHeaders: () => Promise<Record<string, string>>;
  onChanged: () => void;
}) {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filtered = statusFilter === "ALL" ? orders : orders.filter((o) => o.status === statusFilter);

  const setOrderState = async (
    id: string,
    patch: { status?: string; paymentStatus?: string }
  ) => {
    setUpdatingId(id);
    try {
      const headers = await authHeaders();
      await axios.put(`${BACKEND_URL}/admin/order/${id}`, patch, { headers });
      toast.success(`Order updated → ${patch.status ?? patch.paymentStatus}`);
      onChanged();
    } catch {
      toast.error("Failed to update order");
    } finally {
      setUpdatingId(null);
    }
  };

  const summaryCards = [
    { label: "Pending", value: summary?.PENDING ?? 0, cls: "text-amber-400 bg-amber-500/20" },
    { label: "Processing", value: summary?.PROCESSING ?? 0, cls: "text-blue-400 bg-blue-500/20" },
    { label: "Shipped", value: summary?.SHIPPED ?? 0, cls: "text-purple-400 bg-purple-500/20" },
    { label: "Delivered", value: summary?.DELIVERED ?? 0, cls: "text-emerald-400 bg-emerald-500/20" },
    { label: "Cancelled", value: summary?.CANCELLED ?? 0, cls: "text-red-400 bg-red-500/20" },
  ];

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white/5 border border-white/10 rounded-2xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-white/50 text-xs uppercase tracking-wide">{card.label}</p>
              <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${card.cls}`}>
                <Package className="w-3.5 h-3.5" />
              </div>
            </div>
            <p className="text-2xl font-bold text-white mt-2">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        {["ALL", ...ORDER_FLOW, "CANCELLED"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === s ? "bg-purple-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"
            }`}
          >
            {s === "ALL" ? "All" : s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10 text-white/40 text-xs uppercase font-semibold tracking-wider">
                <th className="text-left py-3.5 px-4">Order</th>
                <th className="text-left py-3.5 px-4">Book</th>
                <th className="text-left py-3.5 px-4">Customer</th>
                <th className="text-left py-3.5 px-4">Total</th>
                <th className="text-left py-3.5 px-4">Payment</th>
                <th className="text-left py-3.5 px-4">Status</th>
                <th className="text-right py-3.5 px-4">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((o) => (
                <tr key={o.id} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-4">
                    <p className="font-mono text-xs text-white font-semibold">{o.orderNumber}</p>
                    <p className="text-white/30 text-xs mt-0.5">{timeAgo(o.createdAt)}</p>
                  </td>
                  <td className="py-3.5 px-4">
                    <a href={`/stories/${o.story.id}`} target="_blank" rel="noreferrer" className="text-white/80 hover:text-white text-xs font-medium underline-offset-2 hover:underline">
                      {o.story.title}
                    </a>
                    {o.story.childName && <p className="text-white/30 text-xs">For: {o.story.childName}</p>}
                  </td>
                  <td className="py-3.5 px-4">
                    <p className="text-white/80 text-xs font-medium">{o.customerName}</p>
                    <p className="text-white/30 text-xs flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 shrink-0" /> {o.city} · {o.phone}
                    </p>
                    <p className="text-white/30 text-xs mt-0.5">{o.user?.email}</p>
                  </td>
                  <td className="py-3.5 px-4 text-white font-semibold text-xs">
                    {o.currency} {o.totalAmount.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-4">
                    <PaymentBadge status={o.paymentStatus} />
                    {o.paymentStatus === "PENDING" && o.status !== "CANCELLED" && (
                      <button
                        onClick={() => setOrderState(o.id, { paymentStatus: "PAID" })}
                        disabled={updatingId === o.id}
                        className="mt-1.5 block px-2 py-1 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-40"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    <OrderStatusBadge status={o.status} />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="flex items-center justify-end gap-2 flex-wrap">
                      {o.status === "PENDING" && (
                        <>
                          <button
                            onClick={() => setOrderState(o.id, { status: "PROCESSING" })}
                            disabled={updatingId === o.id}
                            className="px-2.5 py-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-40"
                          >
                            Process
                          </button>
                          <button
                            onClick={() => setOrderState(o.id, { status: "CANCELLED" })}
                            disabled={updatingId === o.id}
                            className="px-2.5 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {o.status === "PROCESSING" && (
                        <>
                          <button
                            onClick={() => setOrderState(o.id, { status: "SHIPPED" })}
                            disabled={updatingId === o.id}
                            className="px-2.5 py-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-40"
                          >
                            <Truck className="w-3 h-3 inline mr-1" />
                            Ship
                          </button>
                          <button
                            onClick={() => setOrderState(o.id, { status: "CANCELLED" })}
                            disabled={updatingId === o.id}
                            className="px-2.5 py-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-40"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                      {o.status === "SHIPPED" && (
                        <button
                          onClick={() => setOrderState(o.id, { status: "DELIVERED" })}
                          disabled={updatingId === o.id}
                          className="px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 rounded-lg text-[10px] font-bold transition-colors disabled:opacity-40"
                        >
                          <CheckCircle2 className="w-3 h-3 inline mr-1" />
                          Delivered
                        </button>
                      )}
                      {(o.status === "DELIVERED" || o.status === "CANCELLED") && (
                        <span className="text-white/20 text-xs">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-12 text-center text-white/30">No orders found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AdminPage() {
  const { getToken } = useAuth();
  const { user, isLoaded } = useUser();
  const isAdmin = user?.primaryEmailAddress?.emailAddress?.toLowerCase() === "monemehamila@gmail.com";

  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stories, setStories] = useState<AdminStory[]>([]);
  const [models, setModels] = useState<AdminModel[]>([]);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [storyStatusFilter, setStoryStatusFilter] = useState("all");
  const [modelStatusFilter, setModelStatusFilter] = useState("all");
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [creditEditorUser, setCreditEditorUser] = useState<AdminUser | null>(null);
  const [grantAmount, setGrantAmount] = useState(1000);
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string | null>(null);
  const [pdfPreviewLoading, setPdfPreviewLoading] = useState(false);
  const [editingStoryId, setEditingStoryId] = useState<string | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [orderSummary, setOrderSummary] = useState<OrdersSummary | null>(null);

  const authHeaders = useCallback(async () => {
    const token = await getToken();
    return { Authorization: `Bearer ${token}` };
  }, [getToken]);

  const handlePreviewEmptyPdf = async () => {
    setPdfPreviewLoading(true);
    try {
      const headers = await authHeaders();
      const response = await axios.get(`${BACKEND_URL}/admin/preview-pdf`, {
        headers,
        responseType: "blob",
      });
      const blob = new Blob([response.data], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      setPdfPreviewUrl(url);
      toast.success("Empty PDF layout preview generated!");
    } catch (error) {
      toast.error("Failed to generate PDF preview");
      console.error(error);
    } finally {
      setPdfPreviewLoading(false);
    }
  };

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await authHeaders();
      const [statsRes, usersRes, storiesRes, modelsRes, activityRes, ordersRes] =
        await Promise.allSettled([
          axios.get(`${BACKEND_URL}/admin/stats`, { headers }),
          axios.get(`${BACKEND_URL}/admin/users`, { headers }),
          axios.get(`${BACKEND_URL}/admin/stories`, { headers }),
          axios.get(`${BACKEND_URL}/admin/models`, { headers }),
          axios.get(`${BACKEND_URL}/admin/activity`, { headers }),
          axios.get(`${BACKEND_URL}/admin/orders`, { headers }),
        ]);

      // Tolerate individual endpoint failures so one bad request can't blank
      // the whole dashboard.
      if (statsRes.status === "fulfilled") setStats(statsRes.value.data);
      if (usersRes.status === "fulfilled") setUsers(usersRes.value.data.users || []);
      if (storiesRes.status === "fulfilled") setStories(storiesRes.value.data.stories || []);
      if (modelsRes.status === "fulfilled") setModels(modelsRes.value.data.models || []);
      if (activityRes.status === "fulfilled") setActivity(activityRes.value.data.activity || []);
      if (ordersRes.status === "fulfilled") {
        setOrders(ordersRes.value.data.orders || []);
        setOrderSummary(ordersRes.value.data.summary || null);
      } else {
        console.warn("Admin orders endpoint failed", ordersRes.reason);
      }
    } catch (err) {
      toast.error("Failed to load admin data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [authHeaders]);

  useEffect(() => {
    if (isAdmin) fetchAll();
  }, [isAdmin, fetchAll]);

  const handleUpdateCredits = async (userId: string, amount: number, action: string) => {
    try {
      const headers = await authHeaders();
      const res = await axios.post(`${BACKEND_URL}/admin/credits`, { userId, amount, action }, { headers });
      toast.success(`Credits updated → ${res.data.credits.toLocaleString()} credits`);
      fetchAll();
    } catch {
      toast.error("Failed to update credits");
    }
  };

  const handleGrantAll = async () => {
    if (!confirm(`Grant ${grantAmount.toLocaleString()} credits to ALL users?`)) return;
    try {
      const headers = await authHeaders();
      const res = await axios.post(`${BACKEND_URL}/admin/grant-free-all`, { amount: grantAmount }, { headers });
      toast.success(res.data.message);
      fetchAll();
    } catch {
      toast.error("Failed to grant credits");
    }
  };

  const handleDeleteUser = async (id: string) => {
    try {
      const headers = await authHeaders();
      await axios.delete(`${BACKEND_URL}/admin/users/${id}`, { headers });
      toast.success("User deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete user");
    }
  };

  const handleDeleteStory = async (id: string) => {
    if (!confirm("Delete this story permanently?")) return;
    try {
      const headers = await authHeaders();
      await axios.delete(`${BACKEND_URL}/admin/story/${id}`, { headers });
      toast.success("Story deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete story");
    }
  };

  const handleDeleteModel = async (id: string) => {
    if (!confirm("Delete this AI model permanently?")) return;
    try {
      const headers = await authHeaders();
      await axios.delete(`${BACKEND_URL}/admin/model/${id}`, { headers });
      toast.success("Model deleted");
      fetchAll();
    } catch {
      toast.error("Failed to delete model");
    }
  };

  const handleQuickStory = async () => {
    try {
      const headers = await authHeaders();
      await axios.post(`${BACKEND_URL}/admin/quick-story`, {}, { headers });
      toast.success("Sample story created!");
      fetchAll();
    } catch {
      toast.error("Failed to create sample story");
    }
  };

  const filteredUsers = users.filter(
    (u) =>
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.id.includes(search)
  );

  const filteredStories = stories.filter((s) => {
    if (storyStatusFilter !== "all" && s.status !== storyStatusFilter) return false;
    if (search && !s.title.toLowerCase().includes(search.toLowerCase()) && !s.user?.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filteredModels = models.filter((m) => {
    if (modelStatusFilter !== "all" && m.trainingStatus !== modelStatusFilter) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase()) && !m.user?.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  // ── Access Gate ───────────────────────────────────────────────────────────

  if (isLoaded && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-stone-50 to-red-50 p-6">
        <div className="bg-white p-10 rounded-3xl border border-stone-200 text-center max-w-md shadow-xl space-y-5">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mx-auto text-3xl">🔒</div>
          <h2 className="text-2xl font-bold text-stone-900 font-serif">Restricted Access</h2>
          <p className="text-stone-500">This control center is private and strictly restricted to the super administrator.</p>
          <a href="/dashboard" className="inline-block px-6 py-3 bg-stone-900 text-white rounded-xl text-sm font-semibold hover:bg-stone-800 transition-all">
            Return to Dashboard
          </a>
        </div>
      </div>
    );
  }

  const tabs: { id: TabType; label: string; icon: React.ReactNode; count?: number }[] = [
    { id: "overview", label: "Overview", icon: <BarChart3 className="w-4 h-4" /> },
    { id: "users", label: "Users", icon: <Users className="w-4 h-4" />, count: users.length },
    { id: "stories", label: "Stories", icon: <BookOpen className="w-4 h-4" />, count: stories.length },
    { id: "facelab", label: "Face Lab", icon: <ScanFace className="w-4 h-4" /> },
    { id: "orders", label: "Orders", icon: <ShoppingBag className="w-4 h-4" />, count: orders.length },
    { id: "models", label: "AI Models", icon: <Sparkles className="w-4 h-4" />, count: models.length },
    { id: "activity", label: "Activity", icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f11] text-white">
      <Toaster position="top-right" />

      {/* Modals */}
      {creditEditorUser && (
        <CreditEditor
          user={creditEditorUser}
          onSave={handleUpdateCredits}
          onClose={() => setCreditEditorUser(null)}
        />
      )}
      {selectedUser && (
        <UserDrawer
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
          onDeleteUser={handleDeleteUser}
          onEditCredits={(u) => { setSelectedUser(null); setCreditEditorUser(u); }}
        />
      )}
      {editingStoryId && (
        <StoryEditor
          storyId={editingStoryId}
          authHeaders={authHeaders}
          onClose={() => setEditingStoryId(null)}
          onChanged={fetchAll}
        />
      )}
      {pdfPreviewUrl && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4" onClick={() => setPdfPreviewUrl(null)}>
          <div className="bg-[#17171a] border border-white/10 rounded-2xl shadow-2xl w-full max-w-5xl h-[90vh] flex flex-col overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#0f0f11]">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500/20 text-purple-400 rounded-lg flex items-center justify-center font-bold text-sm">
                  <FileText className="w-4 h-4 text-purple-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Empty PDF Storybook Layout Preview</h3>
                  <p className="text-white/40 text-xs">A4 Landscape · Margins, Typography & Container Styling</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <a
                  href={pdfPreviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                >
                  <ArrowUpRight className="w-4 h-4" /> Open in New Tab
                </a>
                <a
                  href={pdfPreviewUrl}
                  download="empty-storybook-layout-preview.pdf"
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all"
                >
                  <Download className="w-4 h-4" /> Download PDF
                </a>
                <button onClick={() => setPdfPreviewUrl(null)} className="p-2 hover:bg-white/10 rounded-xl text-white/50 hover:text-white transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-stone-950 p-2">
              <iframe src={pdfPreviewUrl} className="w-full h-full rounded-xl border border-white/5" title="Empty PDF Layout Preview" />
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <div className="flex h-screen overflow-hidden">
        <aside className="w-60 bg-[#17171a] border-r border-white/5 flex flex-col shrink-0">
          <div className="p-5 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
                <ShieldCheck className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-bold text-white text-sm">Admin Console</p>
                <p className="text-white/40 text-xs">StoryBook AI</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 p-3 space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? "bg-purple-600/20 text-purple-300 border border-purple-500/20"
                    : "text-white/50 hover:text-white/80 hover:bg-white/5"
                }`}
              >
                {tab.icon}
                <span className="flex-1 text-left">{tab.label}</span>
                {tab.count !== undefined && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${activeTab === tab.id ? "bg-purple-500/30 text-purple-300" : "bg-white/10 text-white/40"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-3 border-t border-white/5 space-y-2">
            <button
              onClick={fetchAll}
              className="w-full flex items-center gap-2 px-3 py-2 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-xl text-xs font-medium transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
              Refresh Data
            </button>
            <button
              onClick={handleQuickStory}
              className="w-full flex items-center gap-2 px-3 py-2 text-white/40 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl text-xs font-medium transition-all"
            >
              <Play className="w-4 h-4" />
              Create Sample Story
            </button>
            <button
              onClick={handlePreviewEmptyPdf}
              disabled={pdfPreviewLoading}
              className="w-full flex items-center gap-2 px-3 py-2 text-white/40 hover:text-purple-400 hover:bg-purple-500/10 rounded-xl text-xs font-medium transition-all"
            >
              <FileText className={`w-4 h-4 ${pdfPreviewLoading ? "animate-spin" : ""}`} />
              {pdfPreviewLoading ? "Generating..." : "Preview Empty PDF"}
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">

          {/* Top bar */}
          <div className="sticky top-0 bg-[#0f0f11]/80 backdrop-blur-xl border-b border-white/5 px-6 py-4 flex items-center justify-between z-30">
            <div>
              <h1 className="font-bold text-white text-xl capitalize">
                {activeTab === "overview"
                  ? "Dashboard Overview"
                  : activeTab === "facelab"
                    ? "Face Detection Lab"
                    : activeTab === "orders"
                      ? "Order Management"
                      : activeTab}
              </h1>
              <p className="text-white/40 text-xs mt-0.5">StoryBook AI · Super Admin</p>
            </div>
            <div className="flex items-center gap-3">
              {loading && <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />}
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-xl text-xs text-white/60">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                Live
              </div>
            </div>
          </div>

          <div className="p-6 space-y-6">

            {/* ── OVERVIEW TAB ─────────────────────────────────────────────── */}
            {activeTab === "overview" && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "Total Users", value: stats?.totalUsers ?? 0, icon: <Users className="w-5 h-5" />, sub: `+${stats?.newUsersToday ?? 0} today`, color: "blue" },
                    { label: "Stories Created", value: stats?.totalStories ?? 0, icon: <BookOpen className="w-5 h-5" />, sub: `+${stats?.storiesThisWeek ?? 0} this week`, color: "purple" },
                    { label: "AI Models", value: stats?.totalModels ?? 0, icon: <Sparkles className="w-5 h-5" />, sub: `${stats?.pendingModels ?? 0} training now`, color: "indigo" },
                    { label: "Credits Issued", value: (stats?.totalCreditsIssued ?? 0).toLocaleString(), icon: <Coins className="w-5 h-5" />, sub: "across all users", color: "amber" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/8 transition-all">
                      <div className={`w-10 h-10 rounded-xl mb-3 flex items-center justify-center ${
                        stat.color === "blue" ? "bg-blue-500/20 text-blue-400" :
                        stat.color === "purple" ? "bg-purple-500/20 text-purple-400" :
                        stat.color === "indigo" ? "bg-indigo-500/20 text-indigo-400" :
                        "bg-amber-500/20 text-amber-400"
                      }`}>
                        {stat.icon}
                      </div>
                      <p className="text-3xl font-bold text-white mb-1">{stat.value}</p>
                      <p className="text-white/50 text-xs font-medium uppercase tracking-wide">{stat.label}</p>
                      <p className="text-white/30 text-xs mt-1">{stat.sub}</p>
                    </div>
                  ))}
                </div>

                {/* Secondary Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: "New Users This Month", value: stats?.newUsersThisMonth ?? 0, icon: <TrendingUp className="w-4 h-4" />, color: "text-emerald-400" },
                    { label: "Stories Generating", value: stats?.generatingStories ?? 0, icon: <Zap className="w-4 h-4" />, color: "text-amber-400" },
                    { label: "Completed Stories", value: stats?.completedStories ?? 0, icon: <CheckCircle2 className="w-4 h-4" />, color: "text-emerald-400" },
                    { label: "Models in Training", value: stats?.pendingModels ?? 0, icon: <Clock className="w-4 h-4" />, color: "text-purple-400" },
                  ].map((s) => (
                    <div key={s.label} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-center gap-3">
                      <span className={s.color}>{s.icon}</span>
                      <div>
                        <p className="text-white font-bold">{s.value}</p>
                        <p className="text-white/40 text-xs">{s.label}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Grant Credits Panel */}
                <div className="bg-gradient-to-r from-amber-900/30 to-orange-900/30 border border-amber-500/20 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg flex items-center gap-2"><Gift className="w-5 h-5 text-amber-400" /> Grant Credits to All Users</h3>
                      <p className="text-white/50 text-sm mt-1">Give a credit bonus to every registered user at once.</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={grantAmount}
                          onChange={(e) => setGrantAmount(Number(e.target.value))}
                          className="w-28 bg-white/10 border border-white/20 text-white px-3 py-2 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-white/50 text-sm">credits</span>
                      </div>
                      <button onClick={handleGrantAll} className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl font-semibold text-sm shadow-lg shadow-orange-500/20 transition-all">
                        Grant to All
                      </button>
                    </div>
                  </div>
                </div>

                {/* Empty PDF Book Design Previewer Panel */}
                <div className="bg-gradient-to-r from-purple-900/30 via-indigo-900/30 to-slate-900/30 border border-purple-500/20 rounded-2xl p-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-white text-lg flex items-center gap-2">
                        <FileText className="w-5 h-5 text-purple-400" /> Empty PDF Book Design Previewer
                      </h3>
                      <p className="text-white/50 text-sm mt-1">
                        Inspect the PDF book layout, typography, image frames, margins, and page counters on a clean template without needing AI image generation.
                      </p>
                    </div>
                    <button
                      onClick={handlePreviewEmptyPdf}
                      disabled={pdfPreviewLoading}
                      className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-semibold text-sm shadow-lg shadow-purple-500/20 transition-all flex items-center gap-2 shrink-0 disabled:opacity-50"
                    >
                      <Eye className="w-4 h-4" />
                      {pdfPreviewLoading ? "Generating Preview..." : "View Empty PDF Layout"}
                    </button>
                  </div>
                </div>

                {/* System Health */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                  <h3 className="font-bold text-white mb-4 flex items-center gap-2"><Activity className="w-4 h-4 text-emerald-400" /> System Health</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: "Database", status: "Connected", icon: <HardDrive className="w-4 h-4" />, ok: true },
                      { label: "Fal.ai API", status: "Active", icon: <Cpu className="w-4 h-4" />, ok: true },
                      { label: "OpenAI", status: "Connected", icon: <Key className="w-4 h-4" />, ok: true },
                      { label: "Asset Storage", status: "Local Active", icon: <HardDrive className="w-4 h-4" />, ok: true },
                    ].map((s) => (
                      <div key={s.label} className="bg-white/5 rounded-xl p-3 flex items-center gap-2.5">
                        <span className="text-emerald-400">{s.icon}</span>
                        <div>
                          <p className="text-white/80 text-xs font-semibold">{s.label}</p>
                          <p className="text-emerald-400 text-xs">{s.status}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── USERS TAB ────────────────────────────────────────────────── */}
            {activeTab === "users" && (
              <div className="space-y-4">
                {/* Toolbar */}
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      placeholder="Search by email, name or ID..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <button onClick={handleGrantAll} className="px-4 py-2.5 bg-amber-500/20 border border-amber-500/30 text-amber-400 hover:bg-amber-500/30 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all">
                    <Gift className="w-4 h-4" /> Grant {grantAmount.toLocaleString()} to All
                  </button>
                </div>

                {/* Table */}
                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 text-xs uppercase font-semibold tracking-wider">
                          <th className="text-left py-3.5 px-4">User</th>
                          <th className="text-left py-3.5 px-4">Credits</th>
                          <th className="text-left py-3.5 px-4">Models</th>
                          <th className="text-left py-3.5 px-4">Stories</th>
                          <th className="text-left py-3.5 px-4">Joined</th>
                          <th className="text-left py-3.5 px-4">Quick Credit</th>
                          <th className="text-right py-3.5 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredUsers.map((u) => (
                          <tr key={u.id} className="hover:bg-white/5 transition-colors group">
                            <td className="py-3.5 px-4">
                              <div>
                                <button onClick={() => setSelectedUser(u)} className="font-semibold text-white hover:text-purple-300 transition-colors text-left">
                                  {u.name !== "Anonymous" ? u.name : u.email}
                                </button>
                                <p className="text-white/40 text-xs truncate max-w-[200px]">{u.email}</p>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="font-bold text-amber-400">⚡ {u.credits.toLocaleString()}</span>
                            </td>
                            <td className="py-3.5 px-4 text-white/60">{u.modelCount}</td>
                            <td className="py-3.5 px-4 text-white/60">{u.storyCount}</td>
                            <td className="py-3.5 px-4 text-white/40 text-xs">{new Date(u.createdAt).toLocaleDateString()}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleUpdateCredits(u.id, 100, "subtract")} className="px-2 py-1 bg-red-500/20 text-red-400 border border-red-500/20 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors">-100</button>
                                <button onClick={() => handleUpdateCredits(u.id, 100, "add")} className="px-2 py-1 bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/30 rounded-lg text-xs font-bold transition-colors">+100</button>
                                <button onClick={() => handleUpdateCredits(u.id, 500, "add")} className="px-2 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/20 hover:bg-amber-500/30 rounded-lg text-xs font-bold transition-colors">+500</button>
                              </div>
                            </td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => setCreditEditorUser(u)} className="p-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors" title="Edit Credits">
                                  <Coins className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => setSelectedUser(u)} className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors" title="View Profile">
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
                                <button onClick={() => { if (confirm(`Delete ${u.email}?`)) handleDeleteUser(u.id); }} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors" title="Delete User">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredUsers.length === 0 && (
                          <tr><td colSpan={7} className="py-12 text-center text-white/30">No users found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── STORIES TAB ──────────────────────────────────────────────── */}
            {activeTab === "stories" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      placeholder="Search stories..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    {["all", "Completed", "Generating", "Failed"].map((s) => (
                      <button key={s} onClick={() => setStoryStatusFilter(s)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${storyStatusFilter === s ? "bg-purple-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 text-xs uppercase font-semibold tracking-wider">
                          <th className="text-left py-3.5 px-4">Story</th>
                          <th className="text-left py-3.5 px-4">User</th>
                          <th className="text-left py-3.5 px-4">Status</th>
                          <th className="text-left py-3.5 px-4">Pages</th>
                          <th className="text-left py-3.5 px-4">Category</th>
                          <th className="text-left py-3.5 px-4">Created</th>
                          <th className="text-right py-3.5 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredStories.map((s) => (
                          <tr key={s.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-white">{s.title}</p>
                              {s.childName && <p className="text-white/40 text-xs">For: {s.childName}</p>}
                            </td>
                            <td className="py-3.5 px-4 text-white/60 text-xs">{s.user?.email || "Unknown"}</td>
                            <td className="py-3.5 px-4">
                              <StatusBadge status={s.status} />
                            </td>
                            <td className="py-3.5 px-4 text-white/60">{s.pages.length}</td>
                            <td className="py-3.5 px-4">
                              {s.category && <span className="px-2 py-0.5 bg-white/10 text-white/50 rounded-full text-xs capitalize">{s.category}</span>}
                            </td>
                            <td className="py-3.5 px-4 text-white/40 text-xs">{timeAgo(s.createdAt)}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <a
                                  href={s.pdfUrl ? (s.pdfUrl.startsWith("http") ? s.pdfUrl : `${BACKEND_URL}${s.pdfUrl}`) : `${BACKEND_URL}/admin/story/${s.id}/pdf`}
                                  target="_blank"
                                  rel="noreferrer"
                                  download
                                  className="px-2.5 py-1.5 bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold"
                                  title="Download Generated Story PDF"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                  PDF
                                </a>
                                <button onClick={() => setEditingStoryId(s.id)} className="p-1.5 bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg transition-colors" title="Edit Story">
                                  <PencilLine className="w-3.5 h-3.5" />
                                </button>
                                <a href={`/stories/${s.id}`} target="_blank" className="p-1.5 bg-blue-500/20 text-blue-400 hover:bg-blue-500/30 rounded-lg transition-colors" title="View Story" rel="noreferrer">
                                  <Eye className="w-3.5 h-3.5" />
                                </a>
                                <button onClick={() => handleDeleteStory(s.id)} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors" title="Delete Story">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredStories.length === 0 && (
                          <tr><td colSpan={7} className="py-12 text-center text-white/30">No stories found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── FACE LAB TAB ─────────────────────────────────────────────── */}
            {activeTab === "facelab" && <FaceLabTab authHeaders={authHeaders} />}

            {/* ── ORDERS TAB ───────────────────────────────────────────────── */}
            {activeTab === "orders" && (
              <OrdersTab
                orders={orders}
                summary={orderSummary}
                authHeaders={authHeaders}
                onChanged={fetchAll}
              />
            )}

            {/* ── MODELS TAB ───────────────────────────────────────────────── */}
            {activeTab === "models" && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                      type="text"
                      placeholder="Search models..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white text-sm placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  <div className="flex gap-2">
                    {["all", "Generated", "Pending", "Failed"].map((s) => (
                      <button key={s} onClick={() => setModelStatusFilter(s)} className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${modelStatusFilter === s ? "bg-purple-600 text-white" : "bg-white/5 text-white/50 hover:bg-white/10"}`}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-white/10 text-white/40 text-xs uppercase font-semibold tracking-wider">
                          <th className="text-left py-3.5 px-4">Model</th>
                          <th className="text-left py-3.5 px-4">User</th>
                          <th className="text-left py-3.5 px-4">Status</th>
                          <th className="text-left py-3.5 px-4">Stories Used</th>
                          <th className="text-left py-3.5 px-4">Type / Age</th>
                          <th className="text-left py-3.5 px-4">Created</th>
                          <th className="text-right py-3.5 px-4">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5">
                        {filteredModels.map((m) => (
                          <tr key={m.id} className="hover:bg-white/5 transition-colors">
                            <td className="py-3.5 px-4">
                              <div className="flex items-center gap-3">
                                {m.thumbnail ? (
                                  <img src={m.thumbnail} alt={m.name} className="w-9 h-9 rounded-xl object-cover border border-white/10" onError={handleImageError} />
                                ) : (
                                  <div className="w-9 h-9 bg-white/10 rounded-xl flex items-center justify-center">
                                    <Sparkles className="w-4 h-4 text-white/30" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-semibold text-white">{m.name}</p>
                                  <p className="text-white/30 text-xs font-mono truncate max-w-[120px]">{m.tensorPath || "No tensor"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-white/60 text-xs">{m.user?.email || "Unknown"}</td>
                            <td className="py-3.5 px-4"><StatusBadge status={m.trainingStatus} /></td>
                            <td className="py-3.5 px-4 text-white/60">{m.stories?.length ?? 0} stories</td>
                            <td className="py-3.5 px-4 text-white/40 text-xs">{m.type} · {m.age}y</td>
                            <td className="py-3.5 px-4 text-white/40 text-xs">{timeAgo(m.createdAt)}</td>
                            <td className="py-3.5 px-4">
                              <div className="flex items-center justify-end gap-2">
                                <button onClick={() => handleDeleteModel(m.id)} className="p-1.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors" title="Delete Model">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {filteredModels.length === 0 && (
                          <tr><td colSpan={7} className="py-12 text-center text-white/30">No models found</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* ── ACTIVITY TAB ─────────────────────────────────────────────── */}
            {activeTab === "activity" && (
              <div className="space-y-3">
                <h3 className="font-semibold text-white/60 text-sm uppercase tracking-wider">Recent Platform Activity</h3>
                {activity.length === 0 && <p className="text-white/30 text-sm">No recent activity</p>}
                {activity.map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/10 rounded-xl p-4 flex items-start gap-4 hover:bg-white/8 transition-all">
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                      item.type === "user_joined" ? "bg-blue-500/20 text-blue-400" :
                      item.type === "story_created" ? "bg-purple-500/20 text-purple-400" :
                      "bg-amber-500/20 text-amber-400"
                    }`}>
                      {item.type === "user_joined" ? <UserCheck className="w-4 h-4" /> :
                       item.type === "story_created" ? <BookOpen className="w-4 h-4" /> :
                       <Sparkles className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-medium text-sm">
                        {item.type === "user_joined" && "New user joined"}
                        {item.type === "story_created" && "Story created"}
                        {item.type === "model_trained" && "Model training"}
                      </p>
                      <p className="text-white/50 text-xs truncate">{item.label} {item.userEmail ? `· ${item.userEmail}` : ""}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {item.status && <StatusBadge status={item.status} />}
                      <span className="text-white/30 text-xs">{timeAgo(item.time)}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
