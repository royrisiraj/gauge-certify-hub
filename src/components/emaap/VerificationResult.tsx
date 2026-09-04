import { Link } from "@tanstack/react-router";
import { QRCodeSVG } from "qrcode.react";
import { statusMeta, type Tone } from "@/lib/emaap/status";
import { formatDate, formatDateTime, withUnit } from "@/lib/emaap/format";
import { cn } from "@/lib/utils";

export type VerificationPayload = {
  state: string;
  query?: string | null;
  certificate?: {
    number: string;
    code: string;
    issued_at: string;
    valid_from: string;
    valid_until: string;
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
  authority?: { name: string; jurisdiction: string | null; is_demo: boolean } | null;
  decision?: { decision: string; decided_at: string; conditions: string | null } | null;
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

  return (
    <div className="mx-auto w-full max-w-[680px]">
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
          <div>
            <p className="text-[13px] font-semibold uppercase tracking-wider opacity-80">
              Official Verification Record
            </p>
            <h1 id="verification-status" className="text-h2 font-bold tracking-tight">
              <span aria-hidden="true" className="mr-1.5">
                {meta.glyph}
              </span>
              {meta.label}
            </h1>
            <p className="mt-1 text-[15px] font-medium text-foreground">{meta.explanation}</p>
          </div>
        </div>
      </section>

      {data.state === "NOT_FOUND" ? (
        <div className="surface-card mt-4 p-5">
          <h2 className="text-h4 font-semibold">What you can do next</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-[15px] text-muted-foreground">
            <li>Check the identifier for typing errors, then try again.</li>
            <li>Use the exact code printed on the certificate or instrument label.</li>
            <li>
              If the code is printed clearly and still not found, contact the business or the
              issuing authority.
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

      {instrument ? (
        <section className="surface-card mt-4 p-5 sm:p-6" aria-labelledby="instrument-identity">
          <h2 id="instrument-identity" className="text-h4 font-semibold">
            Instrument
          </h2>
          <p className="mt-1 text-h3 font-bold">{instrument.category}</p>
          <p className="text-[15px] text-muted-foreground">
            {instrument.manufacturer} · {instrument.model}
          </p>
          <dl className="mt-4">
            <Row label="Serial number" value={instrument.serial_number} />
            <Row label="Instrument identifier" value={instrument.public_code} />
            <Row
              label="Specified capacity"
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

      {cert ? (
        <section className="surface-card mt-4 p-5 sm:p-6" aria-labelledby="certificate-identity">
          <h2 id="certificate-identity" className="text-h4 font-semibold">
            Certificate
          </h2>
          <dl className="mt-3">
            <Row label="Certificate number" value={cert.number} />
            <Row label="Verification code" value={cert.code} />
            <Row label="Issued on" value={formatDate(cert.issued_at)} />
            <Row label="Valid from" value={formatDate(cert.valid_from)} />
            <Row label="Valid until" value={formatDate(cert.valid_until)} />
            {cert.conditions ? <Row label="Recorded conditions" value={cert.conditions} /> : null}
            {cert.status_reason ? <Row label="Status reason" value={cert.status_reason} /> : null}
          </dl>
          {cert.is_demo ? (
            <p className="mt-3 rounded-md border border-warning/40 bg-warning-subtle px-3 py-2 text-[13px] text-warning">
              Demo record — created to demonstrate the system. Not an actual issued certificate.
            </p>
          ) : null}
        </section>
      ) : null}

      {data.authority ? (
        <section className="surface-card mt-4 p-5 sm:p-6" aria-labelledby="authority-identity">
          <h2 id="authority-identity" className="text-h4 font-semibold">
            Verification authority
          </h2>
          <p className="mt-1 text-[16px] font-semibold">{data.authority.name}</p>
          {data.authority.jurisdiction ? (
            <p className="text-[14px] text-muted-foreground">{data.authority.jurisdiction}</p>
          ) : null}
          {data.decision ? (
            <dl className="mt-3">
              <Row label="Assessment recorded" value={formatDateTime(data.decision.decided_at)} />
              <Row label="Recorded outcome" value={statusMeta(data.decision.decision).label} />
            </dl>
          ) : null}
        </section>
      ) : null}

      {data.request ? (
        <section className="surface-card mt-4 p-5 sm:p-6">
          <h2 className="text-h4 font-semibold">Current verification request</h2>
          <dl className="mt-3">
            <Row label="Request status" value={statusMeta(data.request.status).label} />
            <Row label="Submitted on" value={formatDateTime(data.request.submitted_at)} />
          </dl>
        </section>
      ) : null}

      {shareUrl && cert ? (
        <section className="surface-card mt-4 flex flex-col items-center gap-3 p-5 sm:p-6">
          <h2 className="text-h4 font-semibold">This verification page</h2>
          <div className="rounded-lg border border-border bg-surface p-3">
            <QRCodeSVG
              value={shareUrl}
              size={132}
              level="M"
              title="QR code linking to this verification page"
            />
          </div>
          <p className="numeric break-all text-center text-[13px] text-muted-foreground">
            {shareUrl}
          </p>
        </section>
      ) : null}

      <section className="mt-4 rounded-xl border border-border bg-surface-muted p-5 text-[14px] text-muted-foreground">
        <h2 className="text-h4 font-semibold text-foreground">How this verification works</h2>
        <p className="mt-2">
          This result is provided by the verification system associated with the identifier shown
          above. It reflects the record currently held by this system, including its status and
          dates.
        </p>
        <p className="mt-2">
          The badge, colours and QR graphic on this page are presentation only. They are not
          cryptographic proof. If a result looks wrong, contact the verification authority named on
          the record.
        </p>
        <p className="mt-3">
          <Link to="/verify" className="font-semibold text-primary underline">
            Check another identifier
          </Link>
        </p>
      </section>
    </div>
  );
}
