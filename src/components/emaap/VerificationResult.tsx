import { Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { Printer, Download } from "lucide-react";
import { statusMeta, type Tone } from "@/lib/emaap/status";
import { formatDate, formatDateTime, withUnit } from "@/lib/emaap/format";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type VerificationPayload = {
  state: string;
  query?: string | null;
  certificate?: {
    number: string;
    code: string;
    status?: string;
    issued_at: string;
    valid_from: string;
    valid_until: string | null;
    status_reason: string | null;
    conditions: string | null;
    is_demo: boolean;
  } | null;
  instrument?: {
    category: string;
    manufacturer: string;
    model: string;
    serial_number: string;
    public_code: string;
    capacity_value: string | number | null;
    capacity_unit: string | null;
    resolution_value: string | number | null;
    unit: string;
  } | null;
  business?: {
    name: string;
    city: string | null;
    locality?: string | null;
    state?: string | null;
    address: string | null;
  } | null;
  authority?: { name: string; jurisdiction: string | null; is_demo: boolean } | null;
  decision?: {
    decision: string;
    decided_at: string;
    conditions: string | null;
    override_reason?: string | null;
  } | null;
  request?: { status: string; submitted_at: string } | null;
};

const BANNER_TONE: Record<Tone, string> = {
  success: "bg-success-subtle border-success/40 text-success",
  warning: "bg-warning-subtle border-warning/40 text-warning",
  error: "bg-error-subtle border-error/40 text-error",
  info: "bg-info-subtle border-info/40 text-info",
  neutral: "bg-surface-muted border-border-strong/60 text-muted-foreground",
};

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
      <dt className="label-text text-muted-foreground">{label}</dt>
      <dd className="numeric text-[15px] font-medium text-foreground sm:text-right">{value}</dd>
    </div>
  );
}

/** Public verification card (spec §24–§25). Max width 680px, status first. */
export function VerificationResult({
  data,
  shareUrl,
}: {
  data: VerificationPayload;
  shareUrl?: string | undefined;
}) {
  const meta = statusMeta(data.state);
  const Icon = meta.icon;
  const cert = data.certificate;
  const instrument = data.instrument;
  const business = data.business;
  const isFailed =
    data.state === "FAILED" ||
    data.decision?.decision === "failed" ||
    cert?.status === "failed";

  return (
    <div className="mx-auto w-full max-w-[680px]">
      {/* ── Status Banner (Header) ── */}
      <section
        aria-labelledby="verification-status"
        className={cn(
          "relative overflow-hidden rounded-xl border-2 px-5 py-6 sm:px-7 shadow-sm",
          BANNER_TONE[meta.tone],
        )}
      >
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#ff671f] via-[#000080] to-[#138808]" />
        <div className="flex items-start gap-3 pt-1">
          <Icon aria-hidden="true" className="mt-0.5 size-8 shrink-0" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="text-[13px] font-semibold uppercase tracking-wider opacity-80">
                Official Verification Record
              </p>
              <span className="text-[11px] font-mono uppercase bg-white/70 dark:bg-black/30 px-2 py-0.5 rounded border">
                e-Maap Metrology
              </span>
            </div>
            <h1 id="verification-status" className="text-h2 font-bold tracking-tight mt-0.5">
              {meta.label}
            </h1>
            <p className="mt-1 text-[15px] font-medium text-foreground">{meta.explanation}</p>
          </div>
        </div>
      </section>

      {/* ── Not Found Guidance ── */}
      {data.state === "NOT_FOUND" ? (
        <div className="surface-card mt-4 p-5">
          <h2 className="text-h4 font-semibold">What you can do next</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-muted-foreground">
            <li>Check the identifier for typing errors, then try again.</li>
            <li>Use the exact certificate or result code printed on the label.</li>
            <li>
              If the code is printed clearly and still not found, contact the business or the
              issuing verification authority.
            </li>
          </ul>
          {data.query ? (
            <p className="numeric mt-3 text-[14px] text-muted-foreground">
              Identifier checked:{" "}
              <span className="font-semibold text-foreground">{data.query}</span>
            </p>
          ) : null}
        </div>
      ) : null}

      {/* ── Business Details ── */}
      {business ? (
        <section className="surface-card mt-4 p-5 sm:p-6" aria-labelledby="business-identity">
          <h2 id="business-identity" className="text-h4 font-semibold">
            Business Details
          </h2>
          <dl className="mt-3">
            <Row label="Business Name" value={business.name} />
            <Row
              label="Location / Address"
              value={
                business.address ||
                [business.locality, business.city, business.state].filter(Boolean).join(", ") ||
                "—"
              }
            />
          </dl>
        </section>
      ) : null}

      {/* ── Instrument Details ── */}
      {instrument ? (
        <section className="surface-card mt-4 p-5 sm:p-6" aria-labelledby="instrument-identity">
          <h2 id="instrument-identity" className="text-h4 font-semibold">
            Instrument Details
          </h2>
          <p className="mt-1 text-h3 font-bold">{instrument.category}</p>
          <p className="text-[15px] text-muted-foreground">
            {instrument.manufacturer} · {instrument.model}
          </p>
          <dl className="mt-4">
            <Row label="Instrument ID" value={instrument.public_code} />
            <Row label="Serial Number" value={instrument.serial_number} />
            <Row
              label="Capacity"
              value={withUnit(
                instrument.capacity_value,
                instrument.capacity_unit ?? instrument.unit,
              )}
            />
            <Row
              label="Resolution"
              value={withUnit(instrument.resolution_value, instrument.unit)}
            />
          </dl>
        </section>
      ) : null}

      {/* ── Certificate or Result Details ── */}
      {cert ? (
        <section className="surface-card mt-4 p-5 sm:p-6" aria-labelledby="certificate-identity">
          <div className="flex items-center justify-between">
            <h2 id="certificate-identity" className="text-h4 font-semibold">
              {isFailed ? "Verification Result" : "Verification Certificate"}
            </h2>
            <span
              className={cn(
                "rounded px-2 py-0.5 text-xs font-bold uppercase",
                isFailed
                  ? "bg-red-100 text-red-800 border border-red-200"
                  : "bg-emerald-100 text-emerald-800 border border-emerald-200",
              )}
            >
              {isFailed ? "NOT VERIFIED — FAIL" : "VERIFIED — PASS"}
            </span>
          </div>

          <dl className="mt-3">
            <Row
              label={isFailed ? "Result Number" : "Certificate Number"}
              value={<span className="font-mono font-bold text-primary">{cert.number}</span>}
            />
            <Row
              label="Public Verification Code"
              value={<span className="font-mono font-bold">{cert.code}</span>}
            />
            <Row label="Verification Date" value={formatDate(cert.issued_at || cert.valid_from)} />

            {/* Valid until ONLY shown for PASS certificates, never for FAIL results */}
            {!isFailed && cert.valid_until ? (
              <Row label="Valid Until" value={formatDate(cert.valid_until)} />
            ) : null}

            {cert.conditions ? <Row label="Recorded Conditions" value={cert.conditions} /> : null}

            {isFailed ? (
              <Row
                label="Assessment Summary"
                value={
                  <span className="text-error font-medium">
                    {cert.status_reason ||
                      data.decision?.override_reason ||
                      "Instrument did not meet legal metrology tolerance limits during physical inspection."}
                  </span>
                }
              />
            ) : null}
          </dl>

          {cert.is_demo ? (
            <p className="mt-3 rounded-md border border-warning/40 bg-warning-subtle px-3 py-2 text-[13px] text-warning">
              Demo record — created to demonstrate the system.
            </p>
          ) : null}
        </section>
      ) : null}

      {/* ── Authority Details ── */}
      {data.authority ? (
        <section className="surface-card mt-4 p-5 sm:p-6" aria-labelledby="authority-identity">
          <h2 id="authority-identity" className="text-h4 font-semibold">
            Verification Authority
          </h2>
          <p className="mt-1 text-[16px] font-semibold">{data.authority.name}</p>
          {data.authority.jurisdiction ? (
            <p className="text-[14px] text-muted-foreground">{data.authority.jurisdiction}</p>
          ) : null}
          {data.decision ? (
            <dl className="mt-3">
              <Row label="Inspection Decision Date" value={formatDateTime(data.decision.decided_at)} />
              <Row
                label="Verification Decision"
                value={
                  <span
                    className={cn(
                      "font-semibold",
                      data.decision.decision === "failed" ? "text-error" : "text-success",
                    )}
                  >
                    {data.decision.decision === "failed"
                      ? "NOT VERIFIED — FAIL"
                      : data.decision.decision === "verified_with_conditions"
                        ? "VERIFIED WITH CONDITIONS"
                        : "VERIFIED — PASS"}
                  </span>
                }
              />
            </dl>
          ) : null}
        </section>
      ) : null}

      {/* ── Current Verification Request (if applicable) ── */}
      {data.request && !cert ? (
        <section className="surface-card mt-4 p-5 sm:p-6">
          <h2 className="text-h4 font-semibold">Current Verification Request</h2>
          <dl className="mt-3">
            <Row label="Request Status" value={statusMeta(data.request.status).label} />
            <Row label="Submitted On" value={formatDateTime(data.request.submitted_at)} />
          </dl>
        </section>
      ) : null}

      {/* ── QR Code Verification Card ── */}
      {shareUrl && cert ? (
        <section className="surface-card mt-4 flex flex-col items-center gap-3 p-5 sm:p-6 text-center">
          <h2 className="text-h4 font-semibold">Verify Authenticity via QR Code</h2>
          <p className="text-[14px] text-muted-foreground max-w-md">
            Scan this official QR code with any smartphone camera or QR reader to verify this{" "}
            {isFailed ? "result" : "certificate"} directly on e-Maap without logging in.
          </p>
          <div className="rounded-xl border-2 border-border bg-surface p-4 shadow-sm">
            <QRCodeSVG
              value={shareUrl}
              size={160}
              level="M"
              title="Official e-Maap Verification QR Code"
            />
          </div>
          <p className="font-mono text-[13px] font-bold tracking-wider text-foreground">
            {cert.code}
          </p>
          <p className="numeric break-all text-xs text-muted-foreground">{shareUrl}</p>

          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs"
            >
              <Printer className="size-3.5" />
              Print Record
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="gap-1.5 text-xs"
            >
              <Download className="size-3.5" />
              Download / Save PDF
            </Button>
          </div>
        </section>
      ) : null}

      {/* ── Information / Verification Notice ── */}
      <section className="mt-4 rounded-xl border border-border bg-surface-muted p-5 text-[14px] text-muted-foreground">
        <h2 className="text-h4 font-semibold text-foreground">Verify Certificate Instruction</h2>
        <p className="mt-2">
          This authoritative public verification result is provided by the e-Maap Legal Metrology
          network under the Legal Metrology Act. The status reflects the official database record
          entered by the authorized Legal Metrology Officer.
        </p>
        <p className="mt-3">
          <Link to="/verify" className="font-semibold text-primary underline">
            Check another instrument or certificate
          </Link>
        </p>
      </section>
    </div>
  );
}
