"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, ChevronDown, Compass, ExternalLink, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

import { BACKEND_URL } from "@/app/config";

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
      content: COPY.en.welcome,
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
      return [{ ...current[0], content: COPY[siteLanguage].welcome }];
    });
  }, [siteLanguage]);

  const copy = COPY[siteLanguage];
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
      body: JSON.stringify({ message, language: detectLanguageSafe(message, siteLanguage), history }),
      });
      const payload = await response.json() as { reply?: string; message?: string; templates?: AssistantTemplate[]; actions?: { label: string; href: string }[] };
      if (!response.ok) {
        if (response.status === 403) setBlocked(true);
        throw new Error(payload.message || "Assistant unavailable");
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
          content: error instanceof Error ? error.message : "I couldn't connect right now. You can browse all stories or open the FAQ while I reconnect.",
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
      className="w-full overflow-hidden rounded-[2rem] border-2 border-white/80 bg-white/95 shadow-[0_25px_70px_-30px_rgba(45,25,90,.55)] backdrop-blur-xl"
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

      <div className="max-h-[min(62vh,520px)] space-y-4 overflow-y-auto px-4 py-5 sm:px-5">
        <AnimatePresence initial={false} mode="popLayout">
        {messages.map((message) => (
          <motion.div key={message.id} layout initial={{ opacity: 0, y: 12, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", stiffness: 400, damping: 28 }} className={message.role === "user" ? "flex justify-end" : "flex justify-start"}>
            <div className={message.role === "user" ? "max-w-[88%] rounded-2xl rounded-br-md bg-violet-deep px-4 py-3 text-sm leading-relaxed text-white" : "max-w-[92%] rounded-2xl rounded-bl-md bg-[#f4f0ff] px-4 py-3 text-sm leading-relaxed text-violet-deep"}>
              {message.content}
              {message.templates && message.templates.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {message.templates.map((template, index) => (
                    <motion.div key={template.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.08, type: "spring", stiffness: 350, damping: 24 }} whileHover={{ y: -3, scale: 1.01 }} className="flex gap-3 rounded-2xl bg-white p-2.5 text-left shadow-sm ring-1 ring-violet-100">
                      <div className="size-14 shrink-0 overflow-hidden rounded-xl bg-[#eee9ff]">
                        {template.coverImage ? <img src={template.coverImage} alt="" className="size-full object-cover" /> : <Sparkles className="m-4 size-6 text-primary" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-display font-bold text-violet-deep">{template.title}</p>
                        <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{template.description}</p>
                        <Link href={`/storybook/create?templateId=${encodeURIComponent(template.id)}`} className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                          {copy.choose} <ArrowRight className="size-3" />
                        </Link>
                        <Link href={`/books/${encodeURIComponent(template.id)}`} className="ml-3 mt-1 inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-violet-deep hover:underline">
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
        {sending && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start"><div className="rounded-2xl rounded-bl-md bg-[#f4f0ff] px-4 py-3 text-sm text-violet-deep"><span className="inline-flex gap-1"><i className="size-1.5 animate-bounce rounded-full bg-primary" /><i className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:120ms]" /><i className="size-1.5 animate-bounce rounded-full bg-primary [animation-delay:240ms]" /></span></div></motion.div>}
        </AnimatePresence>
      </div>

      <div className="border-t border-violet-100 px-4 py-3 sm:px-5">
        {messages.length === 1 && (
          <div className="mb-3 grid gap-2 sm:grid-cols-3">
            {welcomePrompts.map(({ label, prompt, icon: Icon }, index) => <motion.button key={label} type="button" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08 }} whileHover={{ y: -3 }} whileTap={{ scale: 0.97 }} onClick={() => void sendMessage(prompt)} className="flex items-center gap-2 rounded-2xl border border-violet-100 bg-violet-50/60 px-3 py-2 text-left text-xs font-bold text-violet-deep transition hover:border-primary/40 hover:bg-white"><Icon className="size-4 shrink-0 text-primary" />{label}</motion.button>)}
          </div>
        )}
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {copy.starters.map((starter) => <motion.button key={starter} type="button" whileHover={{ y: -2 }} whileTap={{ scale: 0.96 }} onClick={() => void sendMessage(starter)} className="shrink-0 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-deep transition hover:border-primary hover:bg-violet-50">{starter}</motion.button>)}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void sendMessage(); }} className="flex items-center gap-2 rounded-2xl bg-[#f7f5fc] p-2 ring-1 ring-violet-100 focus-within:ring-primary/40">
          <input value={input} onChange={(event) => setInput(event.target.value)} maxLength={1200} placeholder={copy.placeholder} className="min-w-0 flex-1 bg-transparent px-2 text-sm text-violet-deep outline-none placeholder:text-muted-foreground" aria-label={copy.placeholder} />
          <button type="submit" disabled={!input.trim() || sending || blocked} aria-label={sendLabel} className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-white transition hover:bg-violet-deep disabled:cursor-not-allowed disabled:opacity-40"><Send className="size-4" /></button>
        </form>
      </div>
    </motion.div>
  );

  if (mode === "section") {
    return (
      <section className="relative overflow-hidden bg-[#f3efff] py-12 lg:py-16">
        <div className="shell relative grid items-center gap-8 lg:grid-cols-[.78fr_1.22fr]">
          <div className="max-w-lg">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white px-3 py-1.5 text-xs font-bold uppercase tracking-[.14em] text-primary shadow-sm"><Compass className="size-3.5" /> {copy.guide}</div>
            <h2 className="font-display text-3xl font-bold leading-tight text-violet-deep sm:text-4xl">{copy.introTitle}</h2>
            <p className="mt-4 text-base leading-relaxed text-muted-foreground">{copy.intro}</p>
          </div>
          <div className="mx-auto w-full max-w-2xl">{panel}</div>
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
