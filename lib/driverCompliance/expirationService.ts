import { complianceApprovalWindowDays } from "./scoringRules.v1";
import type {
  ComplianceExpirationInfo,
  ComplianceSubmission,
} from "./types";

function parseDate(value: string | null): Date | null {
  if (!value) return null;

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function calculateComplianceExpirationDate(
  fromIso: string | null,
  days: number = complianceApprovalWindowDays
): string | null {
  const baseDate = parseDate(fromIso);
  if (!baseDate) return null;

  const nextDate = new Date(baseDate);

  if (days === complianceApprovalWindowDays) {
    nextDate.setFullYear(nextDate.getFullYear() + 1);
  } else {
    nextDate.setDate(nextDate.getDate() + days);
  }

  return nextDate.toISOString();
}

export const buildDefaultExpirationDate = calculateComplianceExpirationDate;

export function isComplianceExpired(
  expiresAt: string | null,
  referenceDate: Date = new Date()
): boolean {
  const expirationDate = parseDate(expiresAt);
  if (!expirationDate) return false;
  return expirationDate.getTime() < referenceDate.getTime();
}

export function getDaysUntilComplianceExpiration(
  expiresAt: string | null,
  referenceDate: Date = new Date()
): number | null {
  const expirationDate = parseDate(expiresAt);
  if (!expirationDate) return null;

  const diffMs = expirationDate.getTime() - referenceDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function getComplianceExpirationInfo(
  submission: Pick<ComplianceSubmission, "expiresAt" | "status">,
  referenceDate: Date = new Date()
): ComplianceExpirationInfo {
  const daysUntilExpiration = getDaysUntilComplianceExpiration(
    submission.expiresAt,
    referenceDate
  );
  const isExpired =
    submission.status === "expired" ||
    isComplianceExpired(submission.expiresAt, referenceDate);

  if (!submission.expiresAt) {
    return {
      expiresAt: null,
      isExpired: false,
      daysUntilExpiration: null,
      label: "Expiration not set",
    };
  }

  const label = isExpired
    ? "Annual review required"
    : daysUntilExpiration === 0
    ? "Expires today"
    : `${daysUntilExpiration} day${daysUntilExpiration === 1 ? "" : "s"} remaining`;

  return {
    expiresAt: submission.expiresAt,
    isExpired,
    daysUntilExpiration,
    label,
  };
}
