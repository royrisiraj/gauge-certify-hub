/**
 * Measurement and date formatting helpers.
 *
 * Measurement values are NEVER rounded here. The value returned by the
 * database is rendered exactly as recorded; only trailing display padding
 * (never truncation) is applied where alignment matters.
 */

export function measurementText(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return String(value);
}

/** Decimal places actually present in the recorded value. */
export function decimalPlaces(value: number | string): number {
  const text = String(value);
  const dot = text.indexOf(".");
  return dot === -1 ? 0 : text.length - dot - 1;
}

export function signedText(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  const text = String(value);
  if (text.startsWith("-") || text.startsWith("+")) return text;
  return Number(text) === 0 ? text : `+${text}`;
}

export function withUnit(value: number | string | null | undefined, unit?: string | null): string {
  const text = measurementText(value);
  if (text === "—" || !unit) return text;
  return `${text} ${unit}`;
}

const DATE_FMT = new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "long", year: "numeric" });
const DATETIME_FMT = new Intl.DateTimeFormat("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATE_FMT.format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return DATETIME_FMT.format(date);
}

export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const date = new Date(value.length <= 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(date.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.round((date.getTime() - today.getTime()) / 86_400_000);
}
