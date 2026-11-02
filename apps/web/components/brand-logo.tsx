import Image from "next/image";
import Link from "next/link";

interface BrandLogoProps {
  href?: string;
  compact?: boolean;
  priority?: boolean;
  className?: string;
}

export function BrandLogo({ href = "/", compact = false, priority = false, className = "" }: BrandLogoProps) {
  const content = (
    <span className={`group inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/brand/logo.svg"
        alt="Mon Petit Hero logo"
        width={compact ? 36 : 40}
        height={compact ? 36 : 40}
        className="transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105"
        priority={priority}
      />
      {!compact && (
        <span className="font-display text-lg font-semibold text-violet-deep sm:text-xl">
          Mon Petit Hero
        </span>
      )}
    </span>
  );

  return href ? <Link href={href} aria-label="Mon Petit Hero home">{content}</Link> : content;
}
