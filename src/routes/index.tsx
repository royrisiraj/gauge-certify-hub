import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ScanLine, ClipboardCheck, ShieldCheck, Building2 } from "lucide-react";
import { PublicShell } from "@/components/emaap/PublicShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "e-Maap — verify weighing and measuring instruments" },
      {
        name: "description",
        content:
          "Check the current verification status of a weighing or measuring instrument or its certificate. No account needed for public verification.",
      },
      { property: "og:title", content: "e-Maap — verify weighing and measuring instruments" },
      {
        property: "og:description",
        content:
          "Public verification for weighing and measuring instruments: enter a certificate number, verification code or serial number.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "e-Maap — verify weighing and measuring instruments" },
      {
        name: "twitter:description",
        content: "Check the current verification status of an instrument or certificate.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = code.trim();
    if (trimmed.length < 4) {
      setError("Enter the full identifier printed on the certificate or instrument label.");
      return;
    }
    setError(null);
    navigate({ to: "/verify/$code", params: { code: trimmed } });
  }

  return (
    <PublicShell>
      <section className="border-b border-border bg-surface">
        <div className="mx-auto w-full max-w-[1200px] px-4 py-12 md:px-8 md:py-16">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,420px)] md:items-start">
            <div>
              <p className="label-text text-primary">Public verification</p>
              <h1 className="mt-2 text-h1 font-bold tracking-tight">
                Check the verification status of a weighing or measuring instrument
              </h1>
              <p className="mt-4 max-w-[56ch] text-[16px] text-muted-foreground">
                e-Maap holds verification records for instruments, the inspections behind them and the certificates
                issued as a result. Anyone can look up a record — no account, no sign-in.
              </p>
              <p className="caption-text mt-4 max-w-[60ch]">
                This deployment contains demo records for demonstration. Configuration values such as validity periods
                and tolerances are illustrative and are not statements of any legal requirement.
              </p>
            </div>

            <form onSubmit={submit} noValidate className="surface-card p-5 sm:p-6">
              <Label htmlFor="home-code" className="label-text">
                Verification identifier
              </Label>
              <p id="home-code-hint" className="caption-text mt-1">
                A certificate number such as VC-2026-000001, a code such as EMAAP-XXXXXXXXXXXX, or the instrument serial
                number.
              </p>
              <Input
                id="home-code"
                name="code"
                value={code}
                autoComplete="off"
                spellCheck={false}
                aria-describedby={error ? "home-code-hint home-code-error" : "home-code-hint"}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setCode(event.target.value)}
                className="numeric mt-3 h-11 text-[16px] uppercase"
                placeholder="EMAAP-…"
              />
              {error ? (
                <p id="home-code-error" role="alert" className="mt-2 text-[14px] font-medium text-error">
                  {error}
                </p>
              ) : null}
              <Button type="submit" className="mt-4 h-11 w-full">
                <ScanLine aria-hidden="true" className="size-4" />
                Check verification status
              </Button>
              <p className="caption-text mt-3">
                Scanning a QR code on a certificate opens the same result page with the identifier filled in.
              </p>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 md:px-8">
        <h2 className="text-h2 font-semibold">How e-Maap works</h2>
        <ul className="mt-6 grid gap-4 md:grid-cols-3">
          <li className="surface-card p-5">
            <Building2 aria-hidden="true" className="size-5 text-primary" />
            <h3 className="mt-3 text-[16px] font-semibold">Owners register instruments</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">
              A business records each weighing or measuring instrument and submits a verification request.
            </p>
          </li>
          <li className="surface-card p-5">
            <ClipboardCheck aria-hidden="true" className="size-5 text-primary" />
            <h3 className="mt-3 text-[16px] font-semibold">Inspectors record measurements</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">
              A verification authority inspects the instrument, captures test measurements as entered and assesses them
              against the configured tolerance rules.
            </p>
          </li>
          <li className="surface-card p-5">
            <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
            <h3 className="mt-3 text-[16px] font-semibold">Decisions become records</h3>
            <p className="mt-1 text-[14px] text-muted-foreground">
              The decision and any certificate are stored as records, and the status shown publicly always reflects
              those records.
            </p>
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="outline" className="h-11">
            <Link to="/verify">Verify an identifier</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11">
            <Link to="/help">How verification results work</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11">
            <Link to="/auth">Sign in for businesses and inspectors</Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
