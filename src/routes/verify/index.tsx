import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ScanLine, QrCode, Camera } from "lucide-react";
import { PublicShell } from "@/components/emaap/PublicShell";
import { QrScanner } from "@/components/emaap/QrScanner";
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
          "Enter a certificate number, verification code, instrument identifier or serial number, or scan a QR code to check its current verification status. No account needed.",
      },
      { property: "og:title", content: "Verify a certificate or instrument — e-Maap" },
      {
        property: "og:description",
        content:
          "Check the current verification status of a weighing or measuring instrument via identifier or live QR scan. No account needed.",
      },
    ],
  }),
  component: VerifyPage,
});

function VerifyPage() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

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

  function handleQrSuccess(scannedCode: string) {
    setCode(scannedCode);
    setError(null);
    setIsScanning(false);
    navigate({ to: "/verify/$code", params: { code: scannedCode } });
  }

  return (
    <PublicShell>
      <div className="mx-auto w-full max-w-[680px] px-4 py-12 md:px-8">
        <h1 className="text-h1 font-bold">Verify an instrument or certificate</h1>
        <p className="mt-2 text-[16px] text-muted-foreground">
          No account is needed. Enter the verification code, certificate number, instrument
          identifier or serial number, or scan a certificate QR code.
        </p>

        {/* 1. Manual Verification Section */}
        <form onSubmit={submit} noValidate className="surface-card mt-6 p-5 sm:p-6">
          <Label htmlFor="verification-code" className="label-text font-semibold text-foreground">
            Verification identifier
          </Label>
          <p id="code-hint" className="caption-text mt-1 text-muted-foreground">
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
          <Button type="submit" className="mt-4 h-11 w-full sm:w-auto font-medium">
            <ScanLine aria-hidden="true" className="size-4" />
            Check verification status
          </Button>
        </form>

        {/* 2. Visual OR Divider */}
        <div className="relative my-8 text-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-[#fafbfc] px-4 text-[13px] font-bold uppercase tracking-wider text-muted-foreground">
              OR
            </span>
          </div>
        </div>

        {/* 3. QR Code Scanner Section */}
        {isScanning ? (
          <div className="mt-2">
            <QrScanner
              onScanSuccess={handleQrSuccess}
              onClose={() => setIsScanning(false)}
            />
          </div>
        ) : (
          <div className="surface-card p-5 sm:p-6 text-center sm:text-left flex flex-col sm:flex-row items-center justify-between gap-4 border-2 border-dashed border-primary/20 bg-primary-subtle/20 hover:border-primary/40 transition-colors">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                <QrCode className="size-6" />
              </div>
              <div>
                <h2 className="text-h4 font-bold text-foreground">
                  Scan Certificate QR Code
                </h2>
                <p className="text-[13.5px] text-muted-foreground mt-0.5">
                  Scan a certificate/result QR code to verify it instantly. Supports mobile cameras & webcams.
                </p>
              </div>
            </div>

            <Button
              id="btn-scan-qr-code"
              type="button"
              onClick={() => setIsScanning(true)}
              className="h-11 px-5 font-semibold bg-[#000080] hover:bg-[#000080]/90 text-white shadow-sm shrink-0 w-full sm:w-auto"
            >
              <Camera className="mr-2 size-4" />
              Scan QR Code
            </Button>
          </div>
        )}

        {/* Informational Guidance */}
        <div className="mt-6 rounded-xl border border-border bg-surface-muted p-5 text-[14px] text-muted-foreground">
          <h2 className="text-h4 font-semibold text-foreground">Scanning a QR code</h2>
          <p className="mt-2 leading-relaxed">
            Every genuine e-Maap certificate and verified instrument label contains an official QR code.
            Click &ldquo;Scan QR Code&rdquo; to use your device&rsquo;s camera, or point your phone&rsquo;s built-in camera
            directly at the QR code to open the verification record without signing in.
          </p>
        </div>
      </div>
    </PublicShell>
  );
}

