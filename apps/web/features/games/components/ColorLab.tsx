"use client";

import { useState } from "react";
import { Check, Droplets, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { GameShell } from "./GameShell";

const colors = [
  { id: "red", label: "Red", hex: "#ef5b62" },
  { id: "yellow", label: "Yellow", hex: "#ffc83d" },
  { id: "blue", label: "Blue", hex: "#5b8def" },
];
const rounds = [
  { name: "Orange", hex: "#f39b3d", recipe: ["red", "yellow"] },
  { name: "Green", hex: "#67ad72", recipe: ["blue", "yellow"] },
  { name: "Purple", hex: "#8d64bb", recipe: ["red", "blue"] },
] as const;

export function ColorLab({ onWin }: { onWin?: () => void }) {
  const [round, setRound] = useState(0); const [selected, setSelected] = useState<string[]>([]); const [message, setMessage] = useState<string | null>(null); const target = rounds[round] ?? rounds[0]!;
  const addColor = (id: string) => { setMessage(null); setSelected((current) => current.includes(id) ? current.filter((value) => value !== id) : [...current, id].slice(-2)); };
  const mix = () => { const correct = selected.length === 2 && target.recipe.every((color) => selected.includes(color)); setMessage(correct ? `Wonderful! You made ${target.name}.` : "That mix made a surprising color. Try two different paints!"); if (correct) { if (round === rounds.length - 1) onWin?.(); window.setTimeout(() => { setRound((value) => (value + 1) % rounds.length); setSelected([]); setMessage(null); }, 900); } };
  const reset = () => { setRound(0); setSelected([]); setMessage(null); };
  return <GameShell title="Color Lab" description="Drag or tap two paint pots into the bowl to make the color your storybook hero needs." score={`${round + 1}/${rounds.length}`} color="coral" onRestart={reset}>
    <div className="mx-auto max-w-xl text-center"><div className="rounded-3xl bg-[#fff4f0] p-5 sm:p-7"><p className="text-sm font-bold uppercase tracking-wider text-[#c55252]">Can you make</p><div className="mt-3 flex items-center justify-center gap-3"><span className="font-display text-3xl font-bold text-violet-deep">{target.name}</span><span className="size-9 rounded-full border-4 border-white shadow" style={{ backgroundColor: target.hex }} aria-label={`Target color ${target.name}`} /></div><p className="mt-2 text-sm text-muted-foreground">Choose two primary colors.</p></div><div className="mt-6 flex flex-wrap justify-center gap-4">{colors.map((color) => { const picked = selected.includes(color.id); return <motion.button key={color.id} type="button" draggable onDragStart={(event) => { const dataTransfer = (event as unknown as { dataTransfer?: DataTransfer }).dataTransfer; dataTransfer?.setData("text/plain", color.id); }} onClick={() => addColor(color.id)} whileHover={{ y: -6, rotate: picked ? 0 : 3 }} whileTap={{ scale: 0.92 }} className={`flex flex-col items-center gap-2 rounded-2xl p-2 transition ${picked ? "bg-violet-100 ring-2 ring-primary" : ""}`} aria-pressed={picked}><span className="grid size-16 place-items-center rounded-full border-4 border-white shadow-lg" style={{ backgroundColor: color.hex }}><Droplets className="size-6 text-white/80" /></span><span className="text-sm font-bold text-violet-deep">{color.label}</span></motion.button>; })}</div><div onDragOver={(event) => event.preventDefault()} onDrop={(event) => { const id = event.dataTransfer.getData("text/plain"); if (id) addColor(id); }} className="mx-auto mt-5 grid min-h-32 max-w-xs place-items-center rounded-[2rem] border-4 border-dashed border-[#efb6a9] bg-white p-4 transition hover:bg-[#fffaf8]"><div className="flex items-center gap-2 text-sm font-bold text-[#c55252]"><Sparkles className="size-5" /> {selected.length ? selected.map((id) => colors.find((color) => color.id === id)?.label).join(" + ") : "Drop paints here"}</div>{selected.length > 0 && <div className="mt-3 flex -space-x-2">{selected.map((id) => { const color = colors.find((item) => item.id === id)!; return <span key={id} className="size-9 rounded-full border-2 border-white" style={{ backgroundColor: color.hex }} />; })}</div>}</div><button type="button" onClick={mix} disabled={selected.length !== 2} className="mt-5 inline-flex items-center gap-2 rounded-full bg-primary px-7 py-3 font-bold text-white transition hover:bg-violet-deep disabled:cursor-not-allowed disabled:opacity-40"><Check className="size-4" /> Mix the colors</button>{message && <motion.p initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className={`mt-4 font-bold ${message.startsWith("Wonderful") ? "text-[#38815a]" : "text-[#c55252]"}`}>{message}</motion.p>}<p className="mt-3 text-xs text-muted-foreground">On a phone? Tap the paint pots instead of dragging.</p></div>
  </GameShell>;
}
