type PlayfulShapesProps = {
  tone?: "light" | "paper" | "violet";
};

export function PlayfulShapes({ tone = "light" }: PlayfulShapesProps) {
  const colors =
    tone === "violet"
      ? ["bg-buttercup", "bg-white/20", "bg-blush"]
      : tone === "paper"
        ? ["bg-buttercup/70", "bg-blush", "bg-violet-ink/10"]
        : ["bg-buttercup", "bg-blush", "bg-violet-ink/10"];

  return (
    <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
      <span className={`shape shape-diamond absolute left-[4%] top-10 size-8 rotate-12 rounded-lg ${colors[0]}`} />
      <span className={`shape shape-orbit absolute right-[7%] top-16 size-5 rounded-full ${colors[1]}`} />
      <span className={`shape shape-blob absolute bottom-12 left-[10%] size-14 rounded-[42%_58%_60%_40%] ${colors[2]}`} />
      <span className={`shape shape-twinkle absolute bottom-14 right-[12%] text-3xl ${tone === "violet" ? "text-buttercup" : "text-violet-ink/30"}`}>✦</span>
    </div>
  );
}
