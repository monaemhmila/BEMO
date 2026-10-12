"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, ChevronDown, Compass, ExternalLink, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { BACKEND_URL } from "../app/config";

type AssistantTemplate = {
  id: string;
  title: string;
  description: string;
  category: string;
  audience: string;
  ageRange: string;
  tags: string[];
  coverImage: string | null;
};

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  templates?: AssistantTemplate[];
  actions?: { label: string; href: string }[];
};

type AssistantChatProps = {
  mode: "section" | "bubble";
};

type ChatLanguage = "en" | "fr" | "ar";

const COPY = {
  en: {
    title: "Ask Mon Petit Hero", subtitle: "Stories, prices, delivery & more", guide: "Your story guide", introTitle: "Not sure where to start?", intro: "Ask our little guide to find the right adventure, explain the creation process, or give you clear answers about books, prices, and delivery.",
    welcome: "Hi! I can help you find a story, understand how Mon Petit Hero works, or answer questions about prices and delivery.", reset: "Fresh start! Would you like help choosing a story, understanding the process, or checking prices and delivery?", placeholder: "Ask me anything about the shop...", open: "Open Mon Petit Hero assistant", close: "Close assistant", resetLabel: "Start a new assistant conversation", send: "Send message", choose: "Choose this story", details: "View details", guideBubble: "Need a story guide?", browse: "Browse every story", create: "Start creating", faq: "See FAQs", how: "See how it works", support: "Open support", find: "Find my story", howPrompt: "Show me how creating and ordering a book works", pricePrompt: "Tell me the book price, payment method, delivery time, and delivery cost", starters: ["Help me choose a story for a 5-year-old", "How much does a printed book cost?", "How long does delivery take?"],
  },
  fr: {
    title: "Demandez à Mon Petit Héros", subtitle: "Histoires, prix, livraison et plus", guide: "Votre guide d'histoires", introTitle: "Vous ne savez pas par où commencer ?", intro: "Demandez à notre guide de trouver la bonne aventure, d'expliquer la création du livre ou de répondre clairement à vos questions sur les prix et la livraison.",
    welcome: "Bonjour ! Je peux vous aider à trouver une histoire, comprendre le fonctionnement de Mon Petit Héros ou répondre à vos questions sur les prix et la livraison.", reset: "Nouveau départ ! Voulez-vous choisir une histoire, comprendre le processus ou vérifier les prix et la livraison ?", placeholder: "Posez votre question sur la boutique...", open: "Ouvrir l'assistant Mon Petit Héros", close: "Fermer l'assistant", resetLabel: "Commencer une nouvelle conversation", choose: "Choisir cette histoire", details: "Voir les détails", guideBubble: "Besoin d'un guide ?", browse: "Voir toutes les histoires", create: "Créer mon livre", faq: "Voir les FAQ", how: "Voir le fonctionnement", support: "Ouvrir l'aide", find: "Trouver mon histoire", howPrompt: "Montrez-moi comment créer et commander un livre", pricePrompt: "Donnez-moi le prix du livre, le mode de paiement et les délais et frais de livraison", starters: ["Aidez-moi à choisir une histoire pour un enfant de 5 ans", "Combien coûte un livre imprimé ?", "Combien de temps prend la livraison ?"],
  },
  ar: {
    title: "اسأل مون بيتي هيرو", subtitle: "القصص والأسعار والتوصيل والمزيد", guide: "دليلك لاختيار القصة", introTitle: "لا تعرف من أين تبدأ؟", intro: "اسأل دليلنا الصغير ليساعدك في اختيار المغامرة المناسبة، وشرح طريقة إنشاء الكتاب، والإجابة عن أسئلة الأسعار والتوصيل.",
    welcome: "مرحبًا! أستطيع مساعدتك في اختيار قصة، وشرح طريقة عمل مون بيتي هيرو، والإجابة عن أسئلة الأسعار والتوصيل.", reset: "بداية جديدة! هل تريد المساعدة في اختيار قصة أو فهم طريقة العمل أو معرفة الأسعار والتوصيل؟", placeholder: "اكتب سؤالك عن المتجر...", open: "فتح مساعد مون بيتي هيرو", close: "إغلاق المساعد", resetLabel: "بدء محادثة جديدة", choose: "اختر هذه القصة", details: "عرض التفاصيل", guideBubble: "تحتاج إلى دليل؟", browse: "تصفح كل القصص", create: "ابدأ إنشاء كتابك", faq: "عرض الأسئلة الشائعة", how: "شاهد طريقة العمل", support: "فتح الدعم", find: "ابحث عن قصتي", howPrompt: "اشرح لي كيف أنشئ كتابًا وأطلبه", pricePrompt: "أخبرني بسعر الكتاب وطريقة الدفع ومدة وتكلفة التوصيل", starters: ["ساعدني في اختيار قصة لطفل عمره 5 سنوات", "كم سعر الكتاب المطبوع؟", "كم تستغرق مدة التوصيل؟"],
  },
} as const;

// The localized copy was previously saved with a legacy encoding in some
// deployments. Decode those values at runtime so every language renders
// correctly even when an older bundle is still cached.
function repairMojibake(value: string): string {
  if (!/[ÃÂØÙ]/.test(value)) return value;
  try {
    const bytes = Uint8Array.from(value, (character) => character.charCodeAt(0));
    return new TextDecoder().decode(bytes);
  } catch {
    return value;
  }
}

const TRANSLATED_COPY = Object.fromEntries(
  Object.entries(COPY).map(([language, values]) => [
    language,
    Object.fromEntries(
      Object.entries(values).map(([key, value]) => [
        key,
        Array.isArray(value) ? value.map(repairMojibake) : typeof value === "string" ? repairMojibake(value) : value,
      ]),
    ),
  ]),
) as typeof COPY;

const SEND_LABELS: Record<ChatLanguage, string> = {
  en: "Send message",
  fr: "Envoyer le message",
  ar: "\u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0633\u0627\u0644\u0629",
};

const PRICE_LABELS: Record<ChatLanguage, string> = {
  en: "Price & delivery",
  fr: "Prix et livraison",
  ar: "\u0627\u0644\u0633\u0639\u0631 \u0648\u0627\u0644\u062a\u0648\u0635\u064a\u0644",
};

function detectLanguage(message: string, selected: ChatLanguage): ChatLanguage {
  if (/[؀-ۿ]/u.test(message)) return "ar";
  if (/[àâçéèêëîïôùûüÿœ]/iu.test(message) || /\b(je|bonjour|prix|livre|livraison|histoire|combien)\b/i.test(message)) return "fr";
  return selected;
}

function detectLanguageSafe(message: string, selected: ChatLanguage): ChatLanguage {
  const hasArabic = Array.from(message).some((character) => {
    const code = character.codePointAt(0) ?? 0;
    return code >= 0x0600 && code <= 0x06ff;
  });
  if (hasArabic) return "ar";
  if (/\b(je|bonjour|prix|livre|livraison|histoire|combien|avec|pour)\b/i.test(message)) return "fr";
  return selected;
}

export function AssistantChat({ mode }: AssistantChatProps) {
  const [open, setOpen] = useState(mode === "section");
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [siteLanguage, setSiteLanguage] = useState<ChatLanguage>("en");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
    content: TRANSLATED_COPY.en.welcome,
    },
  ]);

  useEffect(() => {
    const saved = window.localStorage.getItem("ww_lang");
    const htmlLanguage = document.documentElement.lang;
    const next = saved === "fr" || saved === "ar" ? saved : htmlLanguage === "fr" || htmlLanguage === "ar" ? htmlLanguage : "en";
    setSiteLanguage(next);
  }, []);

  useEffect(() => {
    setMessages((current) => {
      if (current.length !== 1 || !current[0]?.id.startsWith("welcome")) return current;
      return [{ ...current[0], content: TRANSLATED_COPY[siteLanguage].welcome }];
    });
  }, [siteLanguage]);

  const copy = TRANSLATED_COPY[siteLanguage];
  const sendLabel = SEND_LABELS[siteLanguage];
  const welcomePrompts = [
    { label: copy.find, prompt: copy.starters[0], icon: Sparkles },
    { label: copy.how, prompt: copy.howPrompt, icon: Compass },
    { label: PRICE_LABELS[siteLanguage], prompt: copy.pricePrompt, icon: ExternalLink },
  ];

  function actionLabel(href: string, fallback: string) {
    if (href === "/books") return copy.browse;
    if (href === "/storybook/create") return copy.create;
    if (href === "/faqs") return copy.faq;
    if (href === "/support") return copy.support;
    if (href === "/#how-it-works") return copy.how;
    return fallback;
  }

  const history = useMemo(
    () => messages.slice(-8).map(({ role, content }) => ({ role, content })),
    [messages],
  );

  async function sendMessage(value = input) {
    const message = value.trim();
    if (!message || sending || blocked) return;

    const responseLanguage = detectLanguageSafe(message, siteLanguage);
    const unavailableMessage = responseLanguage === "ar"
      ? "المساعد غير متاح مؤقتًا. يمكنك مواصلة تصفح الكتب والأسئلة الشائعة."
      : responseLanguage === "fr"
        ? "L’assistant est temporairement indisponible. Vous pouvez tout de même consulter les livres et la FAQ."
        : "The assistant is temporarily unavailable. You can still browse the books and FAQs.";

    setInput("");
    setOpen(true);
    setSending(true);
    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: message };
    setMessages((current) => [...current, userMessage]);

    try {
      const response = await fetch(`${BACKEND_URL}/assistant/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      body: JSON.stringify({ message, language: responseLanguage, history }),
      });
      const payload = await response.json() as { reply?: string; message?: string; templates?: AssistantTemplate[]; actions?: { label: string; href: string }[] };
      if (!response.ok) {
        if (response.status === 403) setBlocked(true);
        throw new Error(response.status === 403 ? payload.message || unavailableMessage : unavailableMessage);
      }
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: payload.reply || copy.welcome,
          templates: payload.templates,
          actions: payload.actions,
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error instanceof Error && responseLanguage === siteLanguage && error.message !== "Assistant unavailable"
            ? error.message
            : unavailableMessage,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  function resetChat() {
    setBlocked(false);
    setMessages([{
      id: "welcome-reset",
      role: "assistant",
      content: copy.reset,
    }]);
    setInput("");
  }

  const panel = (
    <motion.div
      initial={{ opacity: 0, y: 18, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 12, scale: 0.96 }}
      transition={{ type: "spring", stiffness: 330, damping: 26 }}
      dir={siteLanguage === "ar" ? "rtl" : "ltr"}
      className="w-full overflow-hidden rounded-[2rem] border-2 border-white/80 bg-white/95 text-base shadow-[0_25px_70px_-30px_rgba(45,25,90,.55)] backdrop-blur-xl"
    >
      <div className="flex items-center justify-between bg-[linear-gradient(135deg,#5b3bd4,#7c5ce5)] px-5 py-4 text-white">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25"><Bot className="size-5" /></span>
          <div>
            <p className="font-display text-lg font-bold">{copy.title}</p>
            <p className="text-xs text-white/75">{copy.subtitle}</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={resetChat} aria-label={copy.resetLabel} className="rounded-full p-2 text-white/75 transition hover:bg-white/15 hover:text-white"><RotateCcw className="size-4" /></button>
          {mode === "bubble" && <button type="button" onClick={() => setOpen(false)} aria-label={copy.close} className="rounded-full p-2 text-white/80 transition hover:bg-white/15 hover:text-white"><X className="size-5" /></button>}
        </div>
      </div>

      <div className="max-h-[min(68vh,680px)] space-y-5 overflow-y-auto px-5 py-6 sm:px-8">
        <AnimatePresence initial={false} mode="popLayout">
        {messages.map((message) => (
          <motion.div key={message.id} layout initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} whileHover={{ y: -2 }} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={message.role === "user" ? "max-w-[88%] rounded-2xl rounded-br-md border border-blue-400/30 bg-gradient-to-br from-[#2563eb] via-[#3b82f6] to-[#5b3bd4] px-5 py-4 text-base leading-relaxed text-white shadow-[0_12px_28px_-14px_rgba(37,99,235,.8)]" : "max-w-[92%] rounded-2xl rounded-bl-md border border-amber-300/70 bg-gradient-to-br from-[#fff8c9] via-white to-[#e6f4ff] px-5 py-4 text-base leading-relaxed text-[#24305e] shadow-[0_14px_30px_-16px_rgba(245,183,45,.75)]"}>
              {message.content}
              {message.templates && message.templates.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {message.templates.map((template, index) => (
                    <motion.div key={template.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08, type: "spring", stiffness: 350, damping: 24 }} whileHover={{ y: -4, scale: 1.02, rotate: index % 2 === 0 ? -0.4 : 0.4 }} className="group flex gap-3 rounded-2xl border border-blue-100 bg-white p-2.5 text-left shadow-[0_10px_22px_-16px_rgba(37,99,235,.65)] ring-1 ring-amber-100 transition-shadow hover:border-amber-300 hover:shadow-[0_18px_30px_-16px_rgba(245,183,45,.8)]">
                      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-gradient-to-br from-[#fff1a8] to-[#cfe7ff]">
                        {template.coverImage ? <img src={template.coverImage} alt="" className="size-full object-cover" /> : <Sparkles className="m-4 size-6 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display font-bold text-violet-deep">{template.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{template.description}</p>
                        <Link href={`/storybook/create?templateId=${encodeURIComponent(template.id)}`} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-blue-600 transition-colors group-hover:text-amber-600 hover:underline">
                          {copy.choose} <ArrowRight className="size-3" />
                        </Link>
                        <Link href={`/books/${encodeURIComponent(template.id)}`} className="ml-3 mt-1 inline-flex items-center gap-1 text-xs font-semibold text-slate-500 transition-colors hover:text-blue-600 hover:underline">
                          {copy.details}
                        </Link>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
              {message.actions && message.actions.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {message.actions.map((action) => <Link key={action.href} href={action.href} className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-white px-3 py-1.5 text-xs font-bold text-primary transition hover:-translate-y-0.5 hover:border-primary hover:bg-violet-50"><ExternalLink className="size-3" />{actionLabel(action.href, action.label)}</Link>)}
                </div>
              )}
            </div>
          </motion.div>
        ))}
        {sending && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start"><div className="rounded-2xl rounded-bl-md border border-amber-300/70 bg-gradient-to-r from-[#fff8c9] to-[#e6f4ff] px-5 py-4 text-sm text-blue-700 shadow-[0_12px_24px_-16px_rgba(37,99,235,.7)]"><span className="inline-flex gap-1.5"><i className="size-2 animate-bounce rounded-full bg-amber-400" /><i className="size-2 animate-bounce rounded-full bg-blue-500 [animation-delay:120ms]" /><i className="size-2 animate-bounce rounded-full bg-violet-500 [animation-delay:240ms]" /></span></div></motion.div>}
        </AnimatePresence>
      </div>

      <div className="border-t border-violet-100 px-5 py-4 sm:px-8">
        {messages.length === 1 && (
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            {welcomePrompts.map(({ label, prompt, icon: Icon }, index) => <motion.button key={label} type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} whileHover={{ y: -4, scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => void sendMessage(prompt)} className="flex items-center gap-2 rounded-2xl border border-blue-100 bg-gradient-to-r from-[#fff8c9] to-[#e6f4ff] px-3 py-3 text-left text-xs font-bold text-[#24305e] shadow-[0_8px_18px_-14px_rgba(37,99,235,.8)] transition hover:border-amber-300 hover:shadow-[0_14px_24px_-14px_rgba(245,183,45,.9)]"><Icon className="size-4 shrink-0 text-blue-600" />{label}</motion.button>)}
          </div>
        )}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {copy.starters.map((starter, index) => <motion.button key={starter} type="button" whileHover={{ y: -3, scale: 1.02 }} whileTap={{ scale: 0.96 }} onClick={() => void sendMessage(starter)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold shadow-sm transition ${index % 2 === 0 ? "border-amber-200 bg-amber-50 text-amber-800 hover:border-amber-400 hover:bg-amber-100" : "border-blue-200 bg-blue-50 text-blue-800 hover:border-blue-400 hover:bg-blue-100"}`}>{starter}</motion.button>)}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="flex items-center gap-3 rounded-2xl bg-[#f7f5fc] p-3 ring-1 ring-violet-100 focus-within:ring-primary/40">
          <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200} placeholder={copy.placeholder} className="min-w-0 flex-1 bg-transparent px-3 text-base text-violet-deep outline-none placeholder:text-muted-foreground" aria-label={copy.placeholder} />
          <motion.button whileHover={{ scale: 1.08, rotate: -4 }} whileTap={{ scale: 0.92 }} type="submit" disabled={!input.trim() || sending || blocked} aria-label={sendLabel} className="grid size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-[0_8px_18px_-8px_rgba(37,99,235,.9)] transition hover:from-amber-400 hover:to-orange-500 disabled:cursor-not-allowed disabled:opacity-40"><Send className="size-5" /></motion.button>
        </form>
      </div>
    </motion.div>
  );

  if (mode === "section") {
    return (
      <section className="relative overflow-hidden bg-[#f3efff] py-12 lg:py-16">
        <div className="shell relative w-full">
          <div className="mx-auto w-full max-w-6xl">{panel}</div>
        </div>
      </section>
    );
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      <AnimatePresence>{open && <div dir={siteLanguage === "ar" ? "rtl" : "ltr"} className="w-[min(calc(100vw-2rem),420px)]">{panel}</div>}</AnimatePresence>
      <AnimatePresence>{!open && <motion.button initial={{ opacity: 0, scale: 0.8, y: 12 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.8 }} whileHover={{ y: -5, scale: 1.03 }} whileTap={{ scale: 0.96 }} type="button" onClick={() => setOpen(true)} className="group flex items-center gap-3 rounded-full bg-violet-deep px-4 py-3 text-white shadow-[0_14px_35px_-12px_rgba(45,25,90,.65)] transition hover:bg-primary" aria-label={copy.open}><span className="grid size-10 place-items-center rounded-full bg-white/15"><Bot className="size-5" /></span><span className="hidden pr-1 text-sm font-bold sm:block">{copy.guideBubble}</span><ChevronDown className="size-4 rotate-180 opacity-70" /></motion.button>}</AnimatePresence>
    </div>
  );
}
