import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

/**
 * Restrained identity mark: an Ashoka-blue precision/measurement glyph.
 * Not a flag, seal, or security claim.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-8", className)}>
      <rect x="1" y="1" width="30" height="30" rx="7" fill="var(--color-primary)" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="white" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="1.6" fill="var(--color-saffron)" />
      <path d="M16 7v3M16 22v3M7 16h3M22 16h3" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 22 22 10" stroke="white" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function BrandLockup({ to = "/", subtitle }: { to?: string; subtitle?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5 rounded-md">
      <BrandMark />
      <span className="leading-tight">
        <span className="block text-[18px] font-bold tracking-tight text-primary">e-Maap</span>
        <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {subtitle ?? "Verification service"}
        </span>
      </span>
    </Link>
  );
}
