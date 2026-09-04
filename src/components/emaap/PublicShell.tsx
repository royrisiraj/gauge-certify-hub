import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { LogOut } from "lucide-react";
import { BrandLockup } from "./Brand";
import { supabase } from "@/integrations/supabase/client";

/**
 * Public and onboarding chrome: minimal, accessible, adheres to official e-Maap styling.
 */
export function PublicShell({
  children,
  variant = "public",
}: {
  children: ReactNode;
  variant?: "public" | "onboarding";
}) {
  async function handleSignOut() {
    await supabase.auth.signOut();
    window.location.assign("/auth");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-[#fafbfc]">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-primary"
      >
        Skip to content
      </a>
      {/* Signature tricolor top accent line */}
      <div className="h-1 w-full bg-gradient-to-r from-[#ff671f] via-[#000080] to-[#138808]" />
      <header className="border-b border-border bg-white/95 backdrop-blur-sm sticky top-0 z-30 shadow-[0_1px_3px_rgba(0,0,80,0.03)]">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 md:px-8">
          <BrandLockup />
          <nav
            aria-label={variant === "onboarding" ? "Onboarding navigation" : "Public navigation"}
            className="flex items-center gap-1 text-[14px] font-medium"
          >
            {variant === "public" ? (
              <Link
                to="/verify"
                className="rounded-md px-3 py-2 text-foreground hover:bg-surface-muted transition-colors"
                activeProps={{
                  className: "rounded-md px-3 py-2 bg-primary-subtle text-primary font-semibold",
                }}
              >
                Verify
              </Link>
            ) : null}
            <Link
              to="/help"
              className="rounded-md px-3 py-2 text-foreground hover:bg-surface-muted transition-colors"
              activeProps={{
                className: "rounded-md px-3 py-2 bg-primary-subtle text-primary font-semibold",
              }}
            >
              Help
            </Link>
            <span
              className="ml-1 hidden rounded-md border border-border px-2.5 py-1.5 text-[13px] text-muted-foreground md:inline"
              title="Official portal language: English"
            >
              English
            </span>
            {variant === "public" ? (
              <Link
                to="/auth"
                className="ml-2 rounded-lg bg-[#000080] px-3.5 py-1.5 text-[13px] font-semibold text-white shadow-sm hover:bg-[#000066] transition-colors"
              >
                Sign in
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleSignOut}
                className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs cursor-pointer"
                title="Sign out of current account"
              >
                <LogOut className="size-3.5" aria-hidden="true" />
                Sign out
              </button>
            )}
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border bg-white">
        {/* Initiative slogan with saffron and green flourish lines */}
        <div className="border-b border-border/60 py-4">
          <div className="mx-auto flex items-center justify-center gap-3 px-4 text-center">
            <span className="h-0.5 w-8 rounded-full bg-[#ff671f]" aria-hidden="true" />
            <p className="text-[12px] sm:text-[13px] font-medium text-slate-700 tracking-wide">
              An Initiative Towards Fair Trade and Consumer Protection
            </p>
            <span className="h-0.5 w-8 rounded-full bg-[#138808]" aria-hidden="true" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-[1200px] px-4 py-6 text-[13px] text-muted-foreground md:px-8">
          <p className="max-w-3xl">
            e-Maap is an authoritative verification record system. A result shown here reflects the
            official record held by this system for the identifier entered. Visual elements such as
            badges, colours, seals or QR graphics are not themselves proof of authenticity.
          </p>
          <p className="mt-2 text-[12px]">
            This deployment contains demo records for demonstration. Configuration values such as
            validity periods and tolerances are illustrative and are not statements of any legal
            requirement.
          </p>
        </div>
      </footer>
    </div>
  );
}
