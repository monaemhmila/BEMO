import { Router } from "express";
import { z } from "zod";

import { env } from "../config/env";
import { prismaClient } from "../lib/prisma";
import { authOrGuestMiddleware } from "../middleware/guestAuth";
import { assistantLimiter } from "../middleware/rateLimiter";
import { toStorefrontTemplate } from "../contracts/storybook";

const router = Router();

const MAX_ASSISTANT_MESSAGES_PER_IP = 50;
const ipUsage = new Map<string, { count: number; blocked: boolean }>();

const BLOCK_COPY = {
  en: "This assistant is no longer available from this network because the usage or conversation rules were broken.",
  fr: "Cet assistant n'est plus disponible depuis ce réseau, car les règles d'utilisation ou de conversation n'ont pas été respectées.",
  ar: "لم يعد هذا المساعد متاحًا من هذه الشبكة بسبب مخالفة قواعد الاستخدام أو المحادثة.",
} as const;

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const ABUSE_TERMS = [
  "idiot", "idiote", "stupid", "dumb", "moron", "useless", "worthless", "trash", "shut up", "fuck", "bitch", "asshole", "kill yourself",
  "debile", "nul", "nulle", "ferme la", "ta gueule", "merde", "connard", "connasse", "abruti", "abrutie", "minable", "inutile",
  "\u063a\u0628\u064a", "\u063a\u0628\u064a\u0629", "\u0627\u062d\u0645\u0642", "\u062d\u0645\u0642\u0627\u0621", "\u062a\u0627\u0641\u0647", "\u062a\u0627\u0641\u0647\u0629", "\u0627\u062e\u0631\u0633", "\u0627\u062e\u0631\u0633\u064a", "\u0627\u0633\u0643\u062a", "\u0627\u0633\u0643\u062a\u064a", "\u062d\u0645\u0627\u0631", "\u062e\u0631\u0627", "\u0639\u062f\u064a\u0645 \u0627\u0644\u0641\u0627\u0626\u062f\u0629",
];

function requestedLanguage(value: unknown): "en" | "fr" | "ar" {
  return value === "fr" || value === "ar" ? value : "en";
}

function isAbusive(value: string): boolean {
  const normalized = normalizeText(value);
  return ABUSE_TERMS.some((term) => normalized.includes(normalizeText(term)));
}

function clientIp(req: any): string {
  return String(req.ip || req.socket?.remoteAddress || "unknown");
}

const AssistantSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  language: z.enum(["en", "fr", "ar"]).default("en"),
  history: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().trim().min(1).max(1000),
  })).max(8).default([]),
});

const FiltersSchema = z.object({
  category: z.enum(["adventure", "sentimental", "educative"]).nullable().default(null),
  audience: z.enum(["girl", "boy", "any"]).nullable().default(null),
  ageRange: z.enum(["0-6", "6-9", "9-12", "12-15"]).nullable().default(null),
  tag: z.string().trim().max(40).nullable().default(null),
  sortBy: z.enum(["popular", "difficulty", "newest", "relevance"]).default("relevance"),
});

const ModelResponseSchema = z.object({
  reply: z.string().trim().min(1).max(1200),
  intent: z.enum(["navigation", "template_search", "pricing", "delivery", "creation", "general"]),
  destination: z.enum(["books", "create", "faqs", "support", "how_it_works"]).nullable().default(null),
  filters: FiltersSchema.default({}),
});

const DELIVERY_FACTS = [
  "Standard delivery usually takes 10 to 30 business days.",
  "Express delivery usually takes 7 to 20 business days.",
  "The website does not currently expose a fixed shipping price; the final delivery cost must be confirmed at checkout.",
  "Taxes, customs duties, and import fees may apply depending on the destination and are the recipient's responsibility.",
].join(" ");

const NAVIGATION_RULES = [
  "/books shows all available story templates.",
  "/storybook/create starts the personalized story creation flow.",
  "/support contains help, terms, privacy, and FAQ information.",
].join(" ");

type AssistantTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  audience: string;
  ageRange: string;
  tags: string[];
  coverImage: string | null;
  reviewCount: number;
  difficulty: number;
  createdAt: number;
};

function templateForAssistant(row: any): AssistantTemplate {
  const template = toStorefrontTemplate(row);
  return {
    id: template.id,
    title: template.title,
    description: template.description,
    category: template.category,
    audience: template.audience,
    ageRange: template.ageRange,
    tags: template.tags,
    coverImage: template.coverImage,
    reviewCount: template.review?.count ?? 0,
    difficulty: template.difficulty,
    createdAt: row.createdAt instanceof Date ? row.createdAt.getTime() : Date.parse(String(row.createdAt)),
  };
}

function matchesAge(ageRange: string, requested: string | null): boolean {
  if (!requested) return true;
  return ageRange === requested;
}

function sortTemplates(templates: AssistantTemplate[], sortBy: string, tag: string | null): AssistantTemplate[] {
  const filtered = tag
    ? templates.filter((template) => template.tags.some((item) => item.toLowerCase().includes(tag.toLowerCase())))
    : templates;

  return [...filtered].sort((a, b) => {
    if (sortBy === "popular") return b.reviewCount - a.reviewCount;
    if (sortBy === "difficulty") return a.difficulty - b.difficulty;
    if (sortBy === "newest") return b.createdAt - a.createdAt;
    return b.reviewCount - a.reviewCount;
  });
}

const DESTINATION_ACTIONS: Record<string, { label: string; href: string }> = {
  books: { label: "Open all stories", href: "/books" },
  create: { label: "Start creating", href: "/storybook/create" },
  faqs: { label: "Open FAQs", href: "/faqs" },
  support: { label: "Open support", href: "/support" },
  how_it_works: { label: "See how it works", href: "/#how-it-works" },
};

function actionsForIntent(intent: string, destination: string | null) {
  const directAction = destination ? DESTINATION_ACTIONS[destination] : null;
  if (directAction) return [directAction];
  if (intent === "template_search") {
    return [
      { label: "Browse every story", href: "/books" },
      { label: "Start creating", href: "/storybook/create" },
    ];
  }
  if (intent === "pricing" || intent === "delivery") {
    return [
      { label: "See FAQs", href: "/faqs" },
      { label: "Browse stories", href: "/books" },
    ];
  }
  if (intent === "creation") {
    return [
      { label: "Start your book", href: "/storybook/create" },
      { label: "How it works", href: "/#how-it-works" },
    ];
  }
  return [
    { label: "Explore stories", href: "/books" },
    { label: "Open FAQs", href: "/faqs" },
  ];
}

async function askAssistant(input: z.infer<typeof AssistantSchema>, templates: AssistantTemplate[]) {
  const key = env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY is not configured");

  const catalogue = templates.map((template) => ({
    id: template.id,
    title: template.title,
    description: template.description,
    category: template.category,
    audience: template.audience,
    ageRange: template.ageRange,
    tags: template.tags,
  }));

  const languageName = input.language === "fr" ? "French" : input.language === "ar" ? "Modern Standard Arabic" : "English";
  const system = `You are the Mon Petit Hero website assistant. Be warm, concise, and strict.
Answer every reply exclusively in ${languageName}. Do not switch language unless the user clearly writes in another supported language.
You may help users navigate the website, choose an existing story template, understand the creation flow,
or answer pricing and delivery questions. Never claim to place an order, change an order, access an account,
promise a delivery date, or invent a price, discount, shipping fee, feature, or policy.
Only use these confirmed facts:
- One printed book currently costs ${env.BOOK_PRICE_TND} ${env.BOOK_CURRENCY}; the checkout is cash on delivery.
- ${DELIVERY_FACTS}
- ${NAVIGATION_RULES}
For any request outside these topics, politely say what you can help with and direct the user to support when appropriate.
For a template request, choose filters only when the user's wording supports them. Use null for unknown filters.
Return JSON only with this exact shape:
{"reply":"...","intent":"navigation|template_search|pricing|delivery|creation|general","destination":null,"filters":{"category":null,"audience":null,"ageRange":null,"tag":null,"sortBy":"relevance"}}
For navigation questions, set destination to exactly one of books, create, faqs, support, how_it_works when the user clearly asks where to go. Otherwise use null.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: system },
        { role: "system", content: `Available catalogue for filtering only:\n${JSON.stringify(catalogue)}` },
        ...input.history,
        { role: "user", content: input.message },
      ],
      max_tokens: 500,
      temperature: 0.2,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) throw new Error(`Assistant model request failed: ${response.status}`);
  const payload = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("Assistant returned an empty response");
  return ModelResponseSchema.parse(JSON.parse(content));
}

router.post("/chat", assistantLimiter, authOrGuestMiddleware, async (req, res) => {
  const parsed = AssistantSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ message: "Please send a short question to the assistant." });
    return;
  }

  const language = requestedLanguage(parsed.data.language);
  const ip = clientIp(req);
  const usage = ipUsage.get(ip) ?? { count: 0, blocked: false };
  if (usage.blocked || usage.count >= MAX_ASSISTANT_MESSAGES_PER_IP) {
    usage.blocked = true;
    ipUsage.set(ip, usage);
    res.status(403).json({ message: BLOCK_COPY[language], code: "ASSISTANT_IP_BLOCKED" });
    return;
  }
  usage.count += 1;
  if (isAbusive(parsed.data.message) || usage.count > MAX_ASSISTANT_MESSAGES_PER_IP) {
    usage.blocked = true;
    ipUsage.set(ip, usage);
    res.status(403).json({ message: BLOCK_COPY[language], code: "ASSISTANT_IP_BLOCKED" });
    return;
  }
  ipUsage.set(ip, usage);

  try {
    const rows = await prismaClient.storyTemplate.findMany({
      where: { isActive: true, source: "PREDEFINED" },
      orderBy: [{ difficulty: "asc" }, { name: "asc" }],
    });
    const templates = rows.map(templateForAssistant);
    const result = await askAssistant(parsed.data, templates);
    const filters = result.filters;
    const recommendations = sortTemplates(
      templates.filter((template) =>
        (!filters.category || template.category === filters.category) &&
        (!filters.audience || template.audience === filters.audience || template.audience === "any") &&
        matchesAge(template.ageRange, filters.ageRange)
      ),
      filters.sortBy,
      filters.tag,
    ).slice(0, 4);

    res.json({
      reply: result.reply,
      intent: result.intent,
      templates: recommendations,
      actions: actionsForIntent(result.intent, result.destination),
    });
  } catch (error) {
    res.status(503).json({
      message: "The assistant is temporarily unavailable. You can still browse the books and FAQs.",
      code: "ASSISTANT_UNAVAILABLE",
    });
  }
});

export const assistantRouter = router;
