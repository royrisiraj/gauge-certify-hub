import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  to?: string;
  tone?: "default" | "attention";
};

export function MetricCard({ label, value, hint, icon: Icon, to, tone = "default" }: Props) {
  const body = (
    <div
      className={cn(
        "surface-card h-full p-5",
        tone === "attention" && "border-warning/40 bg-warning-subtle",
        to && "transition-colors hover:border-primary",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="label-text text-muted-foreground">{label}</span>
        {Icon ? <Icon aria-hidden="true" className="size-4 text-muted-foreground" /> : null}
      </div>
      <p className="numeric mt-3 text-numeric font-bold">{value}</p>
      {hint ? <p className="caption-text mt-1">{hint}</p> : null}
    </div>
  );

  if (to) {
    return (
      <Link to={to} className="block rounded-xl">
        {body}
      </Link>
    );
  }
  return body;
}
