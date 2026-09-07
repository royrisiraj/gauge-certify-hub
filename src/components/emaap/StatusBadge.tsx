import { cn } from "@/lib/utils";
import { statusMeta, type Tone } from "@/lib/emaap/status";

const TONE_CLASSES: Record<Tone, string> = {
  success: "bg-success-subtle text-success border-success/30",
  warning: "bg-warning-subtle text-warning border-warning/30",
  error: "bg-error-subtle text-error border-error/30",
  info: "bg-info-subtle text-info border-info/30",
  neutral: "bg-surface-muted text-muted-foreground border-border-strong/60",
};

type Props = {
  status: string | null | undefined;
  /** Show the short secondary explanation under the label. */
  withExplanation?: boolean;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Status is always icon + glyph + text (spec §15) — never colour or a dot alone.
 */
export function StatusBadge({ status, withExplanation = false, size = "md", className }: Props) {
  const meta = statusMeta(status);
  const Icon = meta.icon;

  return (
    <span className={cn("inline-flex max-w-full items-start gap-2", className)}>
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-md border font-semibold uppercase tracking-wide",
          TONE_CLASSES[meta.tone],
          size === "sm" ? "px-2 py-0.5 text-[12px]" : "px-2.5 py-1 text-[13px]",
        )}
      >
        <Icon aria-hidden="true" className={size === "sm" ? "size-3.5" : "size-4"} />
        <span>{meta.label}</span>
      </span>
      {withExplanation && meta.explanation ? (
        <span className="text-[13px] leading-snug text-muted-foreground">{meta.explanation}</span>
      ) : null}
    </span>
  );
}
