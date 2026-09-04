import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { BrandLockup } from "./Brand";
import { supabase } from "@/integrations/supabase/client";
import { useAccount } from "@/lib/emaap/session";
import { cn } from "@/lib/utils";

export type NavItem = { label: string; to: string };

const linkBase = "rounded-md px-3 py-2 text-[14px] font-medium text-foreground hover:bg-surface-muted";
const linkActive = "rounded-md px-3 py-2 text-[14px] font-semibold bg-primary-subtle text-primary";

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

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-primary"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex min-h-16 w-full max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-2 md:px-8">
          <div className="flex items-center gap-3">
            <BrandLockup />
            {contextLabel ? (
              <span className="hidden rounded-md border border-border px-2 py-1 text-[12px] font-semibold uppercase tracking-wide text-muted-foreground md:inline">
                {contextLabel}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden text-[13px] text-muted-foreground sm:inline">
              {account?.fullName ?? account?.email ?? ""}
            </span>
            {typeof unreadCount === "number" && unreadCount > 0 ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-warning/40 bg-warning-subtle px-2 py-1 text-[12px] font-semibold text-warning">
                <Bell aria-hidden="true" className="size-3.5" />
                {unreadCount} unread
              </span>
            ) : null}
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[14px] font-medium text-foreground hover:bg-surface-muted"
            >
              <LogOut aria-hidden="true" className="size-4" />
              Sign out
            </button>
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1200px] px-4 md:px-8">
          <nav aria-label="Application navigation" className="flex flex-wrap items-center gap-1 pb-2">
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
      <main id="main" className={cn("mx-auto w-full max-w-[1200px] flex-1 px-4 py-8 md:px-8")}>
        {children}
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 text-[13px] text-muted-foreground md:px-8">
          Records marked as demo are illustrative only. Configured validity periods and tolerance values in this
          deployment are examples for demonstration and are not statements of any legal requirement.
        </div>
      </footer>
    </div>
  );
}
