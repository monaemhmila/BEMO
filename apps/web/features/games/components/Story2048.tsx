"use client";

import { useCallback, useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp } from "lucide-react";
import { GameShell } from "./GameShell";

type Board = number[];
const START_BOARD: Board = [2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2];
const tileColors: Record<number, string> = { 0: "bg-[#f2edff] text-transparent", 2: "bg-white text-violet-deep", 4: "bg-[#fff0d2] text-violet-deep", 8: "bg-buttercup text-violet-deep", 16: "bg-[#ffad68] text-white", 32: "bg-[#ef8176] text-white", 64: "bg-[#d65662] text-white", 128: "bg-violet-ink text-white", 256: "bg-violet-deep text-white", 512: "bg-[#2e1d76] text-white", 1024: "bg-[#24165b] text-buttercup", 2048: "bg-buttercup text-violet-deep" };

function addTile(board: Board): Board {
  const empty = board.map((value, index) => value === 0 ? index : -1).filter((index) => index >= 0);
  if (!empty.length) return board;
  const target = empty[Math.floor(Math.random() * empty.length)];
  if (target === undefined) return board;
  const next = [...board]; next[target] = Math.random() > 0.85 ? 4 : 2; return next;
}
function moveLine(line: number[]): { line: number[]; gained: number } {
  const compact = line.filter(Boolean); const result: number[] = []; let gained = 0;
  for (let i = 0; i < compact.length; i += 1) { const value = compact[i]; const nextValue = compact[i + 1]; if (value === undefined) continue; if (value === nextValue) { const merged = value * 2; result.push(merged); gained += merged; i += 1; } else result.push(value); }
  while (result.length < 4) result.push(0); return { line: result, gained };
}
function moveBoard(board: Board, direction: "left" | "right" | "up" | "down") {
  const next = Array(16).fill(0) as Board; let gained = 0;
  for (let row = 0; row < 4; row += 1) for (let col = 0; col < 4; col += 1) {
    const line = direction === "left" || direction === "right" ? [0, 1, 2, 3].map((offset) => board[row * 4 + (direction === "left" ? offset : 3 - offset)] ?? 0) : [0, 1, 2, 3].map((offset) => board[(direction === "up" ? offset : 3 - offset) * 4 + col] ?? 0);
    const moved = moveLine(line); gained += moved.gained;
    moved.line.forEach((value, offset) => { if (direction === "left" || direction === "right") next[row * 4 + (direction === "left" ? offset : 3 - offset)] = value; else next[(direction === "up" ? offset : 3 - offset) * 4 + col] = value; });
  }
  return { board: next, gained, changed: next.some((value, index) => value !== board[index]) };
}
function hasMove(board: Board) { return ["left", "right", "up", "down"].some((direction) => moveBoard(board, direction as "left" | "right" | "up" | "down").changed); }

export function Story2048({ onWin }: { onWin?: () => void }) {
  const [board, setBoard] = useState<Board>(() => addTile(addTile(START_BOARD)));
  const [score, setScore] = useState(0);
  const [won, setWon] = useState(false);
  const [over, setOver] = useState(false);
  const move = useCallback((direction: "left" | "right" | "up" | "down") => {
    if (over) return;
    const result = moveBoard(board, direction); if (!result.changed) { if (!hasMove(board)) setOver(true); return; }
    const next = addTile(result.board); setBoard(next); setScore((value) => value + result.gained); if (next.includes(2048)) { setWon(true); onWin?.(); } if (!hasMove(next)) setOver(true);
  }, [board, onWin, over]);
  useEffect(() => { const onKey = (event: KeyboardEvent) => { const map: Record<string, "left" | "right" | "up" | "down"> = { ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" }; const next = map[event.key]; if (next) { event.preventDefault(); move(next); } }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [move]);
  const restart = () => { setBoard(addTile(addTile(Array(16).fill(0)))); setScore(0); setWon(false); setOver(false); };
  return <GameShell title="Storybook 2048" description="Slide matching storybook numbers together. Can you build the legendary 2048 tile?" score={score} color="orange" onRestart={restart}>
    <div className="mx-auto max-w-[420px]">
      <div className="grid grid-cols-4 gap-2 rounded-3xl bg-[#eadfca] p-2 sm:gap-3 sm:p-3">
        {board.map((rawValue, index) => { const value = rawValue ?? 0; return <motion.div key={`${index}-${value}`} layout className={`grid aspect-square place-items-center rounded-xl font-display text-xl font-bold shadow-sm sm:text-2xl ${tileColors[value] ?? "bg-violet-deep text-white"}`} initial={{ scale: 0.55, rotate: -8, opacity: 0 }} animate={{ scale: value ? [0.88, 1.08, 1] : 1, rotate: 0, opacity: 1 }} transition={{ duration: 0.24, ease: "easeOut" }}>{value || "·"}</motion.div>; })}
      </div>
      {(won || over) && <div className="mt-4 rounded-2xl bg-[#fff0d2] p-4 text-center text-violet-deep"><p className="font-display text-xl font-bold">{won ? "You found the hero tile!" : "The board is full."}</p><p className="mt-1 text-sm">{won ? "Keep playing or start a fresh adventure." : "Start over and try a new path."}</p></div>}
      <div className="mx-auto mt-5 grid w-40 grid-cols-3 grid-rows-2 gap-2"><motion.button type="button" onClick={() => move("up")} whileHover={{ y: -3, scale: 1.06 }} whileTap={{ scale: 0.82 }} className="col-start-2 row-start-1 grid size-12 place-items-center rounded-2xl bg-[#fff0d2] text-[#a86d00] shadow-sm transition-colors hover:bg-buttercup" aria-label="Move up"><ChevronUp className="size-6" /></motion.button><motion.button type="button" onClick={() => move("left")} whileHover={{ x: -3, scale: 1.06 }} whileTap={{ scale: 0.82 }} className="col-start-1 row-start-2 grid size-12 place-items-center rounded-2xl bg-[#fff0d2] text-[#a86d00] shadow-sm transition-colors hover:bg-buttercup" aria-label="Move left"><ChevronLeft className="size-6" /></motion.button><motion.button type="button" onClick={() => move("down")} whileHover={{ y: 3, scale: 1.06 }} whileTap={{ scale: 0.82 }} className="col-start-2 row-start-2 grid size-12 place-items-center rounded-2xl bg-[#fff0d2] text-[#a86d00] shadow-sm transition-colors hover:bg-buttercup" aria-label="Move down"><ChevronDown className="size-6" /></motion.button><motion.button type="button" onClick={() => move("right")} whileHover={{ x: 3, scale: 1.06 }} whileTap={{ scale: 0.82 }} className="col-start-3 row-start-2 grid size-12 place-items-center rounded-2xl bg-[#fff0d2] text-[#a86d00] shadow-sm transition-colors hover:bg-buttercup" aria-label="Move right"><ChevronRight className="size-6" /></motion.button></div>
      <p className="mt-3 text-center text-xs text-muted-foreground">Arrow keys, swipe-like buttons, or taps all work.</p>
    </div>
  </GameShell>;
}
