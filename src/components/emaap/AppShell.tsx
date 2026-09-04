import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { BrandLockup } from "./Brand";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/emaap/session";
import { cn } from "@/lib/utils";

export type NavItem = { label: string; to: string };

const linkBase =
  "rounded-lg px-3.5 py-2 text-[14px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors";
const linkActive =
  "rounded-lg px-3.5 py-2 text-[14px] font-semibold bg-[#000080] text-white shadow-xs";

/**
 * Authenticated chrome. Navigation is composed by the role-specific layout —
 * this component never decides permissions; the backend does.
 */
export function AppShell({
  nav,
  contextLabel,
  children,
  unreadCount,
}: {
  nav: NavItem[];
  contextLabel?: string;
  children: ReactNode;
  unreadCount?: number;
}) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: account } = useAccount();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const isBusiness = contextLabel?.toLowerCase().includes("business");

  return (
    <div className="flex min-h-dvh flex-col bg-[#fafbfc]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-primary"
      >
        Skip to content
      </a>
      {/* Signature tricolor top accent bar */}
      <div className="h-1 w-full bg-gradient-to-r from-[#ff671f] via-[#000080] to-[#138808]" />
      <header className="border-b border-border bg-white sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,80,0.03)]">
        <div className="mx-auto flex min-h-16 w-full max-w-[1240px] flex-wrap items-center justify-between gap-3 px-4 py-2.5 md:px-8">
          <div className="flex items-center gap-3">
            <BrandLockup />
            {contextLabel ? (
              <span
                className={cn(
                  "hidden rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider md:inline-flex items-center gap-1.5 border",
                  isBusiness
                    ? "bg-amber-50 text-[#ff671f] border-amber-200"
                    : "bg-blue-50 text-[#000080] border-blue-200",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isBusiness ? "bg-[#ff671f]" : "bg-[#000080]",
                  )}
                />
                {contextLabel}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2.5">
            <div className="hidden flex-col items-end text-right sm:flex">
              <span className="text-[13px] font-semibold text-slate-800">
                {account?.fullName ?? "Authorized User"}
              </span>
              <span className="text-[11px] text-slate-500">{account?.email ?? ""}</span>
            </div>
            {typeof unreadCount === "number" && unreadCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-warning/40 bg-warning-subtle px-2.5 py-1 text-[12px] font-semibold text-warning">
                <Bell aria-hidden="true" className="size-3.5" />
                {unreadCount}
              </span>
            ) : null}
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
            >
              <LogOut aria-hidden="true" className="size-3.5" />
              Sign out
            </button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1240px] px-4 md:px-8">
          <nav
            aria-label="Application navigation"
            className="flex flex-wrap items-center gap-1 pb-2 pt-1 border-t border-slate-100"
          >
            {nav.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={linkBase}
                activeProps={{ className: linkActive }}
                activeOptions={{ exact: false }}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main id="main" className={cn("mx-auto w-full max-w-[1240px] flex-1 px-4 py-8 md:px-8")}>
        {children}
      </main>
      <footer className="border-t border-border bg-white mt-auto">
        {/* Initiative slogan with saffron and green flourish lines */}
        <div className="border-b border-border/60 py-3.5">
          <div className="mx-auto flex items-center justify-center gap-3 px-4 text-center">
            <span className="h-0.5 w-8 rounded-full bg-[#ff671f]" aria-hidden="true" />
            <p className="text-[12px] font-medium text-slate-700 tracking-wide">
              An Initiative Towards Fair Trade and Consumer Protection
            </p>
            <span className="h-0.5 w-8 rounded-full bg-[#138808]" aria-hidden="true" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1240px] px-4 py-4 text-[12px] text-muted-foreground md:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>e-Maap Authoritative Metrology Management System</span>
          <span>Records marked as demo are illustrative only.</span>
        </div>
      </footer>
    </div>
  );
}
