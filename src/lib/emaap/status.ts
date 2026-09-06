import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Circle,
  Clock,
  FileQuestion,
  MinusCircle,
  Search,
  ShieldAlert,
  WifiOff,
  XCircle,
  type LucideIcon,
} from "lucide-react";

export type Tone = "success" | "warning" | "error" | "info" | "neutral";

export type StatusMeta = {
  label: string;
  explanation: string;
  tone: Tone;
  icon: LucideIcon;
  /** Text/character shown alongside the icon so status never relies on colour. */
  glyph: string;
};

/**
 * Single source of status language for the whole product (spec §15, §24).
 * Every consumer must read from here — never re-label a status locally.
 */
export const VERIFICATION_STATES: Record<string, StatusMeta> = {
  VERIFIED: {
    label: "VERIFIED — PASS",
    explanation: "Currently valid and compliant with legal metrology standards",
    tone: "success",
    icon: CheckCircle2,
    glyph: "✓",
  },
  EXPIRING_SOON: {
    label: "EXPIRING SOON",
    explanation: "Valid, but approaching the configured expiry date",
    tone: "warning",
    icon: AlertTriangle,
    glyph: "!",
  },
  EXPIRED: {
    label: "EXPIRED",
    explanation: "This certificate is genuine, but its validity period has ended.",
    tone: "warning",
    icon: Clock,
    glyph: "!",
  },
  SUSPENDED: {
    label: "SUSPENDED",
    explanation: "This certificate exists but is currently not valid.",
    tone: "error",
    icon: ShieldAlert,
    glyph: "!",
  },
  REVOKED: {
    label: "REVOKED",
    explanation: "This certificate has been withdrawn by the verification authority.",
    tone: "error",
    icon: Ban,
    glyph: "×",
  },
  PENDING: {
    label: "PENDING",
    explanation: "Verification is currently in progress.",
    tone: "info",
    icon: Circle,
    glyph: "○",
  },
  NOT_VERIFIED: {
    label: "NOT YET VERIFIED",
    explanation: "This instrument record exists, but no verification has been requested yet.",
    tone: "neutral",
    icon: MinusCircle,
    glyph: "○",
  },
  FAILED: {
    label: "NOT VERIFIED — FAIL",
    explanation: "The most recent verification assessment did not pass. Instrument is not verified.",
    tone: "error",
    icon: XCircle,
    glyph: "×",
  },
  REJECTED: {
    label: "REJECTED",
    explanation: "The most recent verification request was rejected.",
    tone: "error",
    icon: XCircle,
    glyph: "×",
  },
  NOT_FOUND: {
    label: "NOT FOUND",
    explanation: "We could not find a record matching this verification identifier.",
    tone: "neutral",
    icon: FileQuestion,
    glyph: "?",
  },
  SERVICE_ERROR: {
    label: "VERIFICATION UNAVAILABLE",
    explanation:
      "We could not reach the verification service. This does not mean the certificate is invalid.",
    tone: "info",
    icon: WifiOff,
    glyph: "…",
  },
  IDLE: {
    label: "READY",
    explanation: "Enter a verification code to check a record.",
    tone: "neutral",
    icon: Search,
    glyph: "→",
  },
};

/** Record-level statuses used inside the authenticated application. */
export const RECORD_STATUSES: Record<string, StatusMeta> = {
  submitted: {
    label: "SUBMITTED",
    explanation: "Awaiting assignment",
    tone: "info",
    icon: Circle,
    glyph: "○",
  },
  assigned: {
    label: "ASSIGNED",
    explanation: "Assigned to an inspector",
    tone: "info",
    icon: Circle,
    glyph: "○",
  },
  under_review: {
    label: "UNDER REVIEW",
    explanation: "Currently being assessed",
    tone: "info",
    icon: Clock,
    glyph: "○",
  },
  completed: {
    label: "COMPLETED",
    explanation: "Assessment recorded",
    tone: "success",
    icon: CheckCircle2,
    glyph: "✓",
  },
  rejected: {
    label: "REJECTED",
    explanation: "Request was rejected",
    tone: "error",
    icon: XCircle,
    glyph: "×",
  },
  draft: {
    label: "DRAFT",
    explanation: "Not yet submitted",
    tone: "neutral",
    icon: MinusCircle,
    glyph: "○",
  },
  in_progress: {
    label: "IN PROGRESS",
    explanation: "Inspection underway",
    tone: "info",
    icon: Clock,
    glyph: "○",
  },
  active: {
    label: "ACTIVE",
    explanation: "Operationally active",
    tone: "success",
    icon: CheckCircle2,
    glyph: "✓",
  },
  inactive: {
    label: "INACTIVE",
    explanation: "Not currently active",
    tone: "neutral",
    icon: MinusCircle,
    glyph: "○",
  },
  suspended: {
    label: "SUSPENDED",
    explanation: "Currently not valid",
    tone: "error",
    icon: ShieldAlert,
    glyph: "!",
  },
  revoked: { label: "REVOKED", explanation: "Withdrawn", tone: "error", icon: Ban, glyph: "×" },
  pass: {
    label: "PASS",
    explanation: "Within permitted tolerance",
    tone: "success",
    icon: CheckCircle2,
    glyph: "✓",
  },
  review: {
    label: "REVIEW",
    explanation: "Near configured tolerance boundary",
    tone: "warning",
    icon: AlertTriangle,
    glyph: "!",
  },
  fail: {
    label: "FAIL",
    explanation: "Outside permitted tolerance",
    tone: "error",
    icon: XCircle,
    glyph: "×",
  },
  verified: {
    label: "VERIFIED — PASS",
    explanation: "Assessment passed",
    tone: "success",
    icon: CheckCircle2,
    glyph: "✓",
  },
  verified_with_conditions: {
    label: "VERIFIED WITH CONDITIONS",
    explanation: "Passed with recorded conditions",
    tone: "warning",
    icon: AlertTriangle,
    glyph: "!",
  },
  failed: {
    label: "NOT VERIFIED — FAIL",
    explanation: "Assessment did not pass",
    tone: "error",
    icon: XCircle,
    glyph: "×",
  },
};

export function statusMeta(key: string | null | undefined): StatusMeta {
  if (!key) return RECORD_STATUSES["draft"]!;
  return (
    VERIFICATION_STATES[key] ??
    RECORD_STATUSES[key] ?? {
      label: String(key).replace(/_/g, " ").toUpperCase(),
      explanation: "",
      tone: "neutral" as Tone,
      icon: Circle,
      glyph: "○",
    }
  );
}
