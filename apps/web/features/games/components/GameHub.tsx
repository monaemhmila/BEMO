"use client";

import axios from "axios";
import { useCallback, useState } from "react";
import { motion } from "framer-motion";
import { BookOpen, Calculator, Palette, Rabbit, Sparkles } from "lucide-react";
import { HeroSnake } from "./HeroSnake";
import { Story2048 } from "./Story2048";
import { MagicMath } from "./MagicMath";
import { ColorLab } from "./ColorLab";
import { useAuth } from "@/hooks/useAuth";
import { BACKEND_URL } from "@/app/config";

const games = [
  { id: "snake", label: "Hero Snake", description: "Collect glowing stars", icon: Rabbit, color: "bg-[#eee9ff] text-violet-ink" },
  { id: "2048", label: "Storybook 2048", description: "Match magical numbers", icon: BookOpen, color: "bg-[#fff0d2] text-[#a86d00]" },
  { id: "math", label: "Magic Math", description: "Solve number spells", icon: Calculator, color: "bg-[#e4f6eb] text-[#38815a]" },
  { id: "colors", label: "Color Lab", description: "Mix the perfect color", icon: Palette, color: "bg-[#ffe6e1] text-[#c55252]" },
] as const;

export function GameHub() {
  const [active, setActive] = useState<(typeof games)[number]["id"]>("snake");
  const { getToken, isSignedIn } = useAuth();
  const [reward, setReward] = useState<"idle" | "loading" | "claimed" | "error">("idle");
  const claimReward = useCallback(async () => {
    if (reward === "loading" || reward === "claimed") return;
    setReward("loading");
    try {
      const token = await getToken?.();
      if (isSignedIn && !token) throw new Error("Authentication session expired");
      await axios.post(`${BACKEND_URL}/games/reward`, {}, {
        ...(token ? { headers: { Authorization: `Bearer ${token}` } } : {}),
        withCredentials: true,
      });
      setReward("claimed");
    } catch {
      setReward("error");
    }
  }, [getToken, isSignedIn, reward]);
  const renderGame = () => active === "snake" ? <HeroSnake onWin={claimReward} /> : active === "2048" ? <Story2048 onWin={claimReward} /> : active === "math" ? <MagicMath onWin={claimReward} /> : <ColorLab onWin={claimReward} />;
  return <div className="min-h-screen bg-[radial-gradient(120%_80%_at_50%_0%,#ffe9c7_0%,#fdf7ef_38%,#f3ecff_100%)] px-4 pb-20 pt-[9rem] sm:px-6"><div className="mx-auto max-w-6xl"><motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl text-center"><div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25"><Sparkles className="size-7" /></div><p className="text-sm font-bold uppercase tracking-[0.18em] text-primary">The Mon Petit Hero playroom</p><h1 className="mt-3 font-display text-4xl font-bold leading-tight text-violet-deep sm:text-5xl">Play, learn, and become the hero</h1><p className="mx-auto mt-4 max-w-2xl text-base leading-7 text-muted-foreground">Short, colorful games for curious kids — inspired by the same worlds, characters, and imagination behind our personalised storybooks.</p></motion.div><nav className="mx-auto mt-9 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4" aria-label="Choose a game">{games.map((game) => { const Icon = game.icon; const selected = game.id === active; return <motion.button key={game.id} type="button" onClick={() => setActive(game.id)} whileHover={{ y: -4 }} whileTap={{ scale: 0.97 }} aria-pressed={selected} className={`rounded-2xl border p-4 text-left transition-all ${selected ? "border-primary/30 bg-white shadow-lg shadow-violet-900/10" : "border-white/70 bg-white/60 hover:bg-white"}`}><span className={`grid size-10 place-items-center rounded-xl ${game.color}`}><Icon className="size-5" /></span><span className="mt-3 block font-display text-base font-semibold text-violet-deep">{game.label}</span><span className="mt-1 block text-xs text-muted-foreground">{game.description}</span></motion.button>; })}</nav>{reward === "claimed" && <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-6 max-w-4xl rounded-2xl border border-buttercup/50 bg-buttercup/20 p-4 text-center text-sm font-bold text-violet-deep">You unlocked 10% off your next Mon Petit Hero book order! The reward will apply automatically at checkout.</motion.div>}{reward === "error" && <div className="mx-auto mt-6 max-w-4xl rounded-2xl bg-red-50 p-4 text-center text-sm font-bold text-red-700">We couldn&apos;t save the reward yet. Please try again after finishing a game.</div>}<div className="mx-auto mt-8 max-w-4xl">{renderGame()}</div><div className="mx-auto mt-8 max-w-3xl rounded-3xl border border-white/70 bg-white/65 p-5 text-center text-sm leading-6 text-muted-foreground"><span className="font-bold text-violet-deep">Grown-up note:</span> These games are free, account-free, and designed for short, screen-time-friendly play. Ready for a bigger adventure? Explore a personalised book when you&apos;re done.</div></div></div>;
}
