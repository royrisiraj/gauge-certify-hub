import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  to?: string;
  tone?: "default" | "attention" | "success" | "saffron";
};

export function MetricCard({ label, value, hint, icon: Icon, to, tone = "default" }: Props) {
  const getAccentBorder = () => {
    switch (tone) {
      case "attention":
        return "before:bg-[#ff671f]";
      case "success":
        return "before:bg-[#138808]";
      case "saffron":
        return "before:bg-[#ff671f]";
      default:
        return "before:bg-[#000080]";
    }
  };

  const body = (
    <div
      className={cn(
        "surface-card relative overflow-hidden p-5 transition-all duration-200 hover:shadow-md",
        "before:absolute before:top-0 before:left-0 before:right-0 before:h-1",
        getAccentBorder(),
        tone === "attention" && "bg-amber-50/40 border-amber-200/60",
        to && "cursor-pointer hover:border-slate-300",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </span>
        {Icon ? (
          <div
            className={cn(
              "rounded-lg p-2",
              tone === "attention" ? "bg-amber-100 text-[#ff671f]" : "bg-blue-50 text-[#000080]",
            )}
          >
            <Icon aria-hidden="true" className="size-4" />
          </div>
        ) : null}
      </div>
      <p className="numeric mt-3 text-[28px] font-bold tracking-tight text-slate-900">{value}</p>
      {hint ? <p className="caption-text mt-1.5 text-slate-500">{hint}</p> : null}
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
