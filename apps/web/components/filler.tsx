import { cn } from "@/lib/utils";

/**
 * Deterministic pastel picked from the label, so the same book always gets
 * the same filler colour between server and client renders.
 */
const PALETTE = [
  ["#FFD9E8", "#C39BE8"],
  ["#D8ECFF", "#7FB6F2"],
  ["#FFE9C7", "#F5B855"],
  ["#D9F5E3", "#74C79A"],
  ["#EDE0FF", "#9B7BE8"],
  ["#FFE0D6", "#F28F6B"],
];

function hash(input: string) {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = (h * 31 + input.charCodeAt(i)) | 0;
  return Math.abs(h);
}

type FillerImageProps = {
  label: string;
  className?: string;
  /** Shown centred on the swatch. Defaults to the first letters of the label. */
  glyph?: string;
  rounded?: boolean;
};

/**
 * Stand-in for a real <Image>. Replace with next/image once assets exist:
 *   <Image src={book.cover} alt={book.title} fill className="object-cover" />
 */
export function FillerImage({
  label,
  className,
  glyph,
  rounded = true,
}: FillerImageProps) {
  const [from, to] = PALETTE[hash(label) % PALETTE.length] as [string, string];
  const initials =
    glyph ??
    label
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();

  return (
    <div
      role="img"
      aria-label={`${label} (placeholder image)`}
      className={cn(
        "relative flex h-full w-full items-center justify-center overflow-hidden",
        rounded && "rounded-[inherit]",
        className,
      )}
      style={{ background: `linear-gradient(145deg, ${from}, ${to})` }}
    >
      <svg
        aria-hidden
        className="absolute inset-0 h-full w-full opacity-30"
        preserveAspectRatio="none"
      >
        <defs>
          <pattern
            id={`dots-${hash(label)}`}
            width="18"
            height="18"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="2" cy="2" r="1.6" fill="rgba(255,255,255,.85)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#dots-${hash(label)})`} />
      </svg>
      <span className="relative z-10 font-display text-2xl font-semibold text-white/90 drop-shadow-sm">
        {initials}
      </span>
    </div>
  );
}

/**
 * Stand-in for the looping hero video. Drop a real file in /public and pass
 * `src` — the poster gradient stays as the fallback.
 */
export function FillerVideo({
  src,
  label = "Hero video",
  className,
}: {
  src?: string;
  label?: string;
  className?: string;
}) {
  if (!src) {
    return (
      <div
        className={cn(
          "relative flex h-full w-full items-center justify-center overflow-hidden bg-[linear-gradient(140deg,#5b3bd4,#8a6bf0_45%,#ffc83d)]",
          className,
        )}
        role="img"
        aria-label={`${label} (placeholder video)`}
      >
        <div className="flex items-center gap-3 rounded-full bg-black/25 px-5 py-2.5 text-sm font-semibold text-white backdrop-blur-sm">
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M4 2.5v11l9-5.5-9-5.5Z" fill="currentColor" />
          </svg>
          Video placeholder
        </div>
      </div>
    );
  }

  return (
    <video
      className={cn("h-full w-full object-cover", className)}
      autoPlay
      muted
      loop
      playsInline
      aria-label={label}
    >
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
}