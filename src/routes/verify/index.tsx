import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ScanLine } from "lucide-react";
import { PublicShell } from "@/components/emaap/PublicShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/verify/")({
  head: () => ({
    meta: [
      { title: "Verify a certificate or instrument — e-Maap" },
      {
        name: "description",
        content:
          "Enter a certificate number, verification code, instrument identifier or serial number to check its current verification status. No account needed.",
      },
      { property: "og:title", content: "Verify a certificate or instrument — e-Maap" },
      {
        property: "og:description",
        content:
          "Check the current verification status of a weighing or measuring instrument. No account needed.",
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
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
      <div className="mx-auto w-full max-w-[680px] px-4 py-12 md:px-8">
        <h1 className="text-h1 font-bold">Verify an instrument or certificate</h1>
        <p className="mt-2 text-[16px] text-muted-foreground">
          No account is needed. Enter the verification code, certificate number, instrument
          identifier or serial number.
        </p>

        <form onSubmit={submit} noValidate className="surface-card mt-6 p-5 sm:p-6">
          <Label htmlFor="verification-code" className="label-text">
            Verification identifier
          </Label>
          <p id="code-hint" className="caption-text mt-1">
            For example a certificate number such as VC-2026-000001, a code such as
            EMAAP-XXXXXXXXXXXX, or the instrument serial number.
          </p>
          <Input
            id="verification-code"
            name="code"
            value={code}
            autoComplete="off"
            spellCheck={false}
            aria-describedby={error ? "code-hint code-error" : "code-hint"}
            aria-invalid={error ? true : undefined}
            onChange={(event) => setCode(event.target.value)}
            className="numeric mt-3 h-11 text-[16px] uppercase"
            placeholder="EMAAP-…"
          />
          {error ? (
            <p id="code-error" role="alert" className="mt-2 text-[14px] font-medium text-error">
              {error}
            </p>
          ) : null}
          <Button type="submit" className="mt-4 h-11 w-full sm:w-auto">
            <ScanLine aria-hidden="true" className="size-4" />
            Check verification status
          </Button>
        </form>

        <div className="mt-6 rounded-xl border border-border bg-surface-muted p-5 text-[14px] text-muted-foreground">
          <h2 className="text-h4 font-semibold text-foreground">Scanning a QR code</h2>
          <p className="mt-2">
            A QR code on a certificate opens this verification page directly with the identifier
            already filled in. If a scan does not open, type the identifier printed next to the QR
            code.
          </p>
        </div>
      </div>
    </PublicShell>
  );
}
