"use client";

import { useMemo, useState } from "react";
import { Check, Lightbulb, X } from "lucide-react";
import { motion } from "framer-motion";
import { GameShell } from "./GameShell";

type Question = { a: number; b: number; operation: "+" | "−"; answer: number };
function makeQuestion(round: number): Question { const a = 3 + ((round * 7) % 12); const b = 1 + ((round * 5) % Math.max(2, a - 1)); return round % 2 === 0 ? { a, b, operation: "+", answer: a + b } : { a, b, operation: "−", answer: a - b }; }
function choices(question: Question) { return Array.from(new Set([question.answer, question.answer + 1, question.answer - 2, question.answer + 3])).filter((value) => value >= 0).sort(() => Math.random() - 0.5); }

export function MagicMath({ onWin }: { onWin?: () => void }) {
  const [round, setRound] = useState(1); const [score, setScore] = useState(0); const [streak, setStreak] = useState(0); const [selected, setSelected] = useState<number | null>(null);
  const question = useMemo(() => makeQuestion(round), [round]); const options = useMemo(() => choices(question), [question]);
  const answer = (value: number) => { if (selected !== null) return; setSelected(value); if (value === question.answer) { if (score >= 4) onWin?.(); setScore((current) => current + 1); setStreak((current) => current + 1); } else setStreak(0); };
  const next = () => { setRound((value) => value + 1); setSelected(null); };
  const restart = () => { setRound(1); setScore(0); setStreak(0); setSelected(null); };
  return <GameShell title="Magic Math Quiz" description="Solve quick number spells to help your hero unlock the next chapter. No pressure — just playful practice." score={`${score}/∞`} color="green" onRestart={restart}>
    <div className="mx-auto max-w-xl text-center"><div className="mb-6 flex items-center justify-between text-sm font-bold text-muted-foreground"><span>Chapter {round}</span><span className="inline-flex items-center gap-1 text-[#38815a]"><Lightbulb className="size-4" /> Streak {streak}</span></div><motion.div key={round} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-[2rem] bg-[#e4f6eb] p-7 sm:p-10"><p className="text-sm font-bold uppercase tracking-wider text-[#38815a]">Solve the spell</p><p className="mt-4 font-display text-5xl font-bold text-violet-deep sm:text-6xl">{question.a} {question.operation} {question.b} = ?</p></motion.div><div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">{options.map((option) => { const isSelected = selected === option; const correct = selected !== null && option === question.answer; const wrong = isSelected && option !== question.answer; return <button type="button" key={option} onClick={() => answer(option)} className={`flex min-h-16 items-center justify-center gap-2 rounded-2xl border-2 font-display text-2xl font-bold transition-all hover:-translate-y-1 ${correct ? "border-[#38815a] bg-[#e4f6eb] text-[#38815a]" : wrong ? "border-red-300 bg-red-50 text-red-600" : "border-border bg-white text-violet-deep hover:border-primary"}`}>{option}{correct && <Check className="size-5" />}{wrong && <X className="size-5" />}</button>; })}</div>{selected !== null && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-5"><p className={`font-bold ${selected === question.answer ? "text-[#38815a]" : "text-red-600"}`}>{selected === question.answer ? "Brilliant! Your hero found the answer." : `Almost! The answer is ${question.answer}.`}</p><button type="button" onClick={next} className="mt-3 rounded-full bg-primary px-6 py-3 font-bold text-white transition hover:bg-violet-deep">Next chapter →</button></motion.div>}</div>
  </GameShell>;
}
