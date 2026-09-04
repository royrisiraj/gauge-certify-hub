import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { BrandLockup } from "./Brand";

/**
 * Public chrome (spec §25): deliberately minimal, no authenticated navigation.
 */
export function PublicShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-[14px] focus:font-semibold focus:text-primary"
      >
        Skip to content
      </a>
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-16 w-full max-w-[1200px] items-center justify-between px-4 md:px-8">
          <BrandLockup />
          <nav aria-label="Public navigation" className="flex items-center gap-1 text-[14px] font-medium">
            <Link
              to="/verify"
              className="rounded-md px-3 py-2 text-foreground hover:bg-surface-muted"
              activeProps={{ className: "rounded-md px-3 py-2 bg-primary-subtle text-primary" }}
            >
              Verify
            </Link>
            <Link
              to="/help"
              className="rounded-md px-3 py-2 text-foreground hover:bg-surface-muted"
              activeProps={{ className: "rounded-md px-3 py-2 bg-primary-subtle text-primary" }}
            >
              Help
            </Link>
            <span
              className="ml-1 hidden rounded-md border border-border px-2.5 py-1.5 text-[13px] text-muted-foreground md:inline"
              title="Additional languages are planned. English is the only language currently available."
            >
              English
            </span>
            <Link
              to="/auth"
              className="ml-1 rounded-md border border-border px-3 py-2 text-foreground hover:bg-surface-muted"
            >
              Sign in
            </Link>
          </nav>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-8 text-[13px] text-muted-foreground md:px-8">
          <p className="max-w-3xl">
            e-Maap is a verification record system. A result shown here reflects the record held by this system for the
            identifier you entered. Visual elements such as badges, colours, seals or QR graphics are not themselves
            proof of authenticity.
          </p>
          <p className="mt-2">
            This deployment contains demo records for demonstration. Configuration values such as validity periods and
            tolerances are illustrative and are not statements of any legal requirement.
          </p>
        </div>
      </footer>
    </div>
  );
}
