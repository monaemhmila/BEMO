"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { GameShell } from "./GameShell";

type Point = { x: number; y: number };
type Direction = "up" | "down" | "left" | "right";
const COLS = 16;
const ROWS = 11;
const START: Point[] = [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }];

function nextFood(snake: Point[]): Point {
  for (let attempt = 0; attempt < 200; attempt += 1) {
    const point = { x: Math.floor(Math.random() * COLS), y: Math.floor(Math.random() * ROWS) };
    if (!snake.some((part) => part.x === point.x && part.y === point.y)) return point;
  }
  return { x: 12, y: 2 };
}

export function HeroSnake({ onWin }: { onWin?: () => void }) {
  const [snake, setSnake] = useState<Point[]>(START);
  const [food, setFood] = useState<Point>({ x: 11, y: 5 });
  const [direction, setDirection] = useState<Direction>("right");
  const [queued, setQueued] = useState<Direction>("right");
  const [score, setScore] = useState(0);
  const [running, setRunning] = useState(true);
  const changeDirection = useCallback((next: Direction) => {
    const opposite: Record<Direction, Direction> = { up: "down", down: "up", left: "right", right: "left" };
    if (opposite[direction] !== next) setQueued(next);
  }, [direction]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const map: Record<string, Direction> = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right", w: "up", s: "down", a: "left", d: "right" };
      const next = map[event.key];
      if (next) { event.preventDefault(); changeDirection(next); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [changeDirection]);

  useEffect(() => {
    if (!running) return;
    const timer = window.setInterval(() => {
      setSnake((current) => {
        const nextDirection = queued;
        setDirection(nextDirection);
        const head = current[0]!;
        const delta: Record<Direction, Point> = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } };
        const next = { x: head.x + delta[nextDirection].x, y: head.y + delta[nextDirection].y };
        const hitWall = next.x < 0 || next.x >= COLS || next.y < 0 || next.y >= ROWS;
        const hitSelf = current.some((part) => part.x === next.x && part.y === next.y);
        if (hitWall || hitSelf) { setRunning(false); return current; }
        const ate = next.x === food.x && next.y === food.y;
        const updated = [next, ...current];
        if (ate) { const nextScore = current.length - START.length + 1; setScore((value) => value + 1); if (nextScore >= 10) onWin?.(); setFood(nextFood(updated)); return updated; }
        updated.pop();
        return updated;
      });
    }, 170);
    return () => window.clearInterval(timer);
  }, [food, onWin, queued, running]);

  const restart = () => { setSnake(START); setFood({ x: 11, y: 5 }); setDirection("right"); setQueued("right"); setScore(0); setRunning(true); };
  const controls: { direction: Direction; icon: typeof ArrowUp }[] = [{ direction: "up", icon: ArrowUp }, { direction: "left", icon: ArrowLeft }, { direction: "down", icon: ArrowDown }, { direction: "right", icon: ArrowRight }];

  return (
    <GameShell title="Hero Snake" description="Guide your glowing hero through the storybook garden. Collect stars, grow longer, and beat your best score." score={score} color="violet" onRestart={restart}>
      <div className="mx-auto max-w-[560px]">
        <div className="relative grid aspect-[16/11] grid-cols-16 overflow-hidden rounded-3xl border-4 border-violet-100 bg-[#f4f0ff] p-1" style={{ gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))` }}>
          {Array.from({ length: COLS * ROWS }, (_, index) => {
            const x = index % COLS; const y = Math.floor(index / COLS);
            const part = snake.find((item) => item.x === x && item.y === y);
            const isFood = food.x === x && food.y === y;
            return <div key={`${x}-${y}`} className="relative aspect-square rounded-md bg-white/45">{isFood && <motion.div animate={{ scale: [0.75, 1.1, 0.75], rotate: [0, 15, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} className="absolute inset-[18%] rounded-full bg-buttercup shadow-[0_0_12px_#ffc83d]" />}{part && <motion.div layout className={`absolute inset-[8%] rounded-[35%] ${part === snake[0] ? "bg-violet-deep ring-2 ring-white" : "bg-primary/80"}`} />}</div>;
          })}
          {!running && <div className="absolute inset-0 grid place-items-center bg-violet-deep/80 p-6 text-center text-white backdrop-blur-sm"><div><Trophy className="mx-auto mb-2 size-9 text-buttercup" /><p className="font-display text-2xl font-bold">Adventure paused!</p><p className="mt-1 text-sm text-white/80">You scored {score}. Tap Start over for another try.</p></div></div>}
        </div>
        <div className="mx-auto mt-4 grid w-36 grid-cols-3 gap-2">
          {controls.map(({ direction: move, icon: Icon }, index) => <button key={move} type="button" onClick={() => changeDirection(move)} aria-label={`Move ${move}`} className={`${index === 0 ? "col-start-2" : index === 1 ? "col-start-1" : index === 2 ? "col-start-2" : "col-start-3"} grid size-10 place-items-center rounded-xl bg-violet-100 text-violet-deep transition hover:bg-primary hover:text-white active:scale-90`}><Icon className="size-5" /></button>)}
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Use the arrow keys or buttons. Eat the golden stars!</p>
      </div>
    </GameShell>
  );
}
