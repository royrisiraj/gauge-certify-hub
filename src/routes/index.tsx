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
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-[#fafbfc] to-white py-12 md:py-16">
        {/* Subtle background glow accents */}
        <div
          className="pointer-events-none absolute -top-24 -left-24 size-96 rounded-full bg-orange-100/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -bottom-24 -right-24 size-96 rounded-full bg-emerald-100/40 blur-3xl"
          aria-hidden="true"
        />

        <div className="relative mx-auto w-full max-w-[1200px] px-4 md:px-8">
          <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(0,440px)] md:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3 py-1 text-[12px] font-bold uppercase tracking-wider text-[#000080]">
                <span className="size-1.5 rounded-full bg-[#000080]" />
                Public Verification Portal
              </div>
              <h1 className="mt-3 text-[32px] sm:text-[40px] font-extrabold tracking-tight text-slate-900 leading-tight">
                Check the verification status of a weighing or measuring instrument
              </h1>
              <p className="mt-4 max-w-[56ch] text-[16px] text-slate-600 leading-relaxed">
                e-Maap holds official verification records for commercial instruments, the
                inspections behind them, and the certificates issued as a result. Anyone can look up
                a record — no account, no sign-in.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-3 text-[13px] text-slate-500">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#138808]" /> No login required
                </span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#000080]" /> Instant lookup
                </span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-2 rounded-full bg-[#ff671f]" /> QR code compatible
                </span>
              </div>
            </div>

            {/* Elevated Verification Card with dual top accent strip */}
            <form
              onSubmit={submit}
              noValidate
              className="surface-card relative overflow-hidden p-6 sm:p-7 shadow-lg border-slate-200/80 bg-white"
            >
              {/* Dual saffron and green top accent line */}
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ff671f] via-[#ff671f] to-[#138808]" />

              <div className="mb-4">
                <Label htmlFor="home-code" className="text-[15px] font-bold text-slate-900">
                  Verification Identifier
                </Label>
                <p id="home-code-hint" className="caption-text mt-1 text-slate-500">
                  Enter certificate number (e.g., VC-2026-000001), verification code (EMAAP-...), or
                  instrument serial number.
                </p>
              </div>

              <Input
                id="home-code"
                name="code"
                value={code}
                autoComplete="off"
                spellCheck={false}
                aria-describedby={error ? "home-code-hint home-code-error" : "home-code-hint"}
                aria-invalid={error ? true : undefined}
                onChange={(event) => setCode(event.target.value)}
                className="numeric h-12 text-[16px] uppercase tracking-wider font-semibold border-slate-300 focus:border-[#000080] focus:ring-[#000080]"
                placeholder="EMAAP-XXXXXXXXXXXX"
              />
              {error ? (
                <p
                  id="home-code-error"
                  role="alert"
                  className="mt-2 text-[14px] font-medium text-red-600 flex items-center gap-1.5"
                >
                  <span className="size-1 rounded-full bg-red-600" />
                  {error}
                </p>
              ) : null}
              <Button
                type="submit"
                className="mt-4 h-12 w-full bg-[#000080] hover:bg-[#000066] text-white font-semibold shadow-sm transition-all"
              >
                <ScanLine aria-hidden="true" className="size-4 mr-2" />
                Check Verification Status
              </Button>
              <p className="caption-text mt-3 text-center text-slate-400">
                Scanning a QR code on a certificate opens the exact result directly.
              </p>
            </form>
          </div>
        </div>
      </section>

      <section className="mx-auto w-full max-w-[1200px] px-4 py-12 md:px-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="h-1 w-6 rounded-full bg-[#ff671f]" />
          <span className="h-1 w-6 rounded-full bg-[#000080]" />
          <span className="h-1 w-6 rounded-full bg-[#138808]" />
        </div>
        <h2 className="text-h2 font-bold tracking-tight text-slate-900">How e-Maap Works</h2>
        <ul className="mt-6 grid gap-5 md:grid-cols-3">
          <li className="surface-card relative overflow-hidden p-6 transition-all hover:shadow-md before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-[#ff671f]">
            <div className="size-10 rounded-lg bg-orange-50 flex items-center justify-center text-[#ff671f] mb-3">
              <Building2 aria-hidden="true" className="size-5" />
            </div>
            <h3 className="text-[17px] font-bold text-slate-900">Owners Register Instruments</h3>
            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
              A business records each commercial weighing or measuring instrument and submits an
              official verification request.
            </p>
          </li>
          <li className="surface-card relative overflow-hidden p-6 transition-all hover:shadow-md before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-[#000080]">
            <div className="size-10 rounded-lg bg-blue-50 flex items-center justify-center text-[#000080] mb-3">
              <ClipboardCheck aria-hidden="true" className="size-5" />
            </div>
            <h3 className="text-[17px] font-bold text-slate-900">Inspectors Record Measurements</h3>
            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
              A legal metrology authority inspects the instrument, captures test measurements as
              entered, and assesses them against standard tolerance rules.
            </p>
          </li>
          <li className="surface-card relative overflow-hidden p-6 transition-all hover:shadow-md before:absolute before:top-0 before:left-0 before:right-0 before:h-1 before:bg-[#138808]">
            <div className="size-10 rounded-lg bg-emerald-50 flex items-center justify-center text-[#138808] mb-3">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <h3 className="text-[17px] font-bold text-slate-900">
              Decisions Become Official Records
            </h3>
            <p className="mt-2 text-[14px] text-slate-600 leading-relaxed">
              Verification decisions and certificates are securely stored as authoritative records,
              and the status shown publicly always reflects verified records.
            </p>
          </li>
        </ul>

        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild variant="outline" className="h-11 border-slate-300 font-medium">
            <Link to="/verify">Verify an identifier</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11 font-medium text-slate-700">
            <Link to="/help">How verification results work</Link>
          </Button>
          <Button asChild variant="ghost" className="h-11 font-medium text-[#000080]">
            <Link to="/auth">Sign in for businesses and inspectors</Link>
          </Button>
        </div>
      </section>
    </PublicShell>
  );
}
