import { CATEGORY_META, type StoryTemplate } from "@/data/story-templates";
import { cn } from "@/lib/utils";

interface TemplateBookCoverProps {
  template: StoryTemplate;
  className?: string;
  sizes?: string;
  priority?: boolean;
}

/**
 * Cover art framed to read as a physical book: a darker spine on the left,
 * a stitched page edge on the right and a soft shadow underneath.
 */
export function TemplateBookCover({
  template,
  className,
  sizes = "(max-width: 768px) 358px, (max-width: 1280px) 390px, 390px",
  priority = false,
}: TemplateBookCoverProps) {
  return (
    <div
      className={cn(
        "relative aspect-square w-full overflow-hidden rounded-tr-md rounded-br-md bg-zinc-100 shadow-[0_30px_60px_-34px_rgba(31,22,54,.6)]",
        CATEGORY_META[template.category].accent,
        className,
      )}
    >
      <img
        src={template.coverImage}
        alt={`${template.title} book cover`}
        width={390}
        height={390}
        sizes={sizes}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
        className="absolute inset-0 h-full w-full object-cover"
      />

      {/* spine */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[7%] bg-gradient-to-r from-violet-900/40 via-violet-900/15 to-transparent" />
      <div className="pointer-events-none absolute inset-y-0 left-[7%] w-px bg-white/30" />

      {/* page edges */}
      <div className="pointer-events-none absolute inset-y-0 right-0 w-[3%] bg-[repeating-linear-gradient(to_left,rgba(31,22,54,.18)_0_1px,transparent_1px_4px)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3%] bg-[repeating-linear-gradient(to_top,rgba(31,22,54,.14)_0_1px,transparent_1px_5px)]" />

      {/* gloss */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-white/20 via-transparent to-transparent" />
    </div>
  );
}
