import { ImagePlus } from "lucide-react";

interface PlaceholderProps {
  className?: string;
  label?: string;
}

export function Placeholder({
  className = "w-full h-full",
  label = "Image coming soon",
}: PlaceholderProps) {
  return (
    <div
      className={`flex items-center justify-center bg-gradient-to-br from-buttercup/15 to-blush/40 ${className}`}
      role="img"
      aria-label={label}
    >
      <div className="text-center px-4">
        <ImagePlus className="w-10 h-10 text-buttercup mx-auto mb-2" />
        <p className="text-sm text-primary font-medium">{label}</p>
      </div>
    </div>
  );
}