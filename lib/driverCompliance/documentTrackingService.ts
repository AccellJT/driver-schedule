import type {
  ComplianceDocumentAlert,
  ComplianceDocumentTracking,
} from "./types";

const documentAlertWindowDays = 30;

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeOptionalDate(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 10) : null;
}

function parseDateOnly(value: string | null): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T12:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getDaysUntilDate(value: string | null, referenceDate: Date): number | null {
  const targetDate = parseDateOnly(value);
  if (!targetDate) {
    return null;
  }

  const comparisonDate = new Date(referenceDate);
  comparisonDate.setHours(12, 0, 0, 0);

  const diffMs = targetDate.getTime() - comparisonDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function buildDefaultComplianceDocumentTracking(): ComplianceDocumentTracking {
  return {
    w9SavedToGusto: false,
    contractSavedToGusto: false,
    insuranceSavedToGusto: false,
    insuranceExpiresOn: null,
    driversLicenseSavedToGusto: false,
    driversLicenseExpiresOn: null,
    updatedAt: null,
  };
}

export function normalizeComplianceDocumentTracking(
  tracking: ComplianceDocumentTracking
): ComplianceDocumentTracking {
  return {
    w9SavedToGusto: tracking.w9SavedToGusto === true,
    contractSavedToGusto: tracking.contractSavedToGusto === true,
    insuranceSavedToGusto: tracking.insuranceSavedToGusto === true,
    insuranceExpiresOn: normalizeOptionalDate(tracking.insuranceExpiresOn),
    driversLicenseSavedToGusto: tracking.driversLicenseSavedToGusto === true,
    driversLicenseExpiresOn: normalizeOptionalDate(tracking.driversLicenseExpiresOn),
    updatedAt: typeof tracking.updatedAt === "string" && tracking.updatedAt.trim().length > 0
      ? tracking.updatedAt
      : null,
  };
}

export function parseComplianceDocumentTracking(value: unknown): ComplianceDocumentTracking {
  if (!isPlainObject(value)) {
    return buildDefaultComplianceDocumentTracking();
  }

  return normalizeComplianceDocumentTracking({
    w9SavedToGusto: value.w9SavedToGusto === true,
    contractSavedToGusto: value.contractSavedToGusto === true,
    insuranceSavedToGusto: value.insuranceSavedToGusto === true,
    insuranceExpiresOn: normalizeOptionalDate(value.insuranceExpiresOn),
    driversLicenseSavedToGusto: value.driversLicenseSavedToGusto === true,
    driversLicenseExpiresOn: normalizeOptionalDate(value.driversLicenseExpiresOn),
    updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : null,
  });
}

function buildDateAlert({
  key,
  label,
  savedToGusto,
  expiresOn,
  referenceDate,
}: {
  key: ComplianceDocumentAlert["key"];
  label: string;
  savedToGusto: boolean;
  expiresOn: string | null;
  referenceDate: Date;
}): ComplianceDocumentAlert {
  if (!savedToGusto) {
    return {
      key,
      label,
      status: "missing",
      expiresOn,
      daysUntilDue: null,
      message: `${label} has not been confirmed in Gusto yet.`,
    };
  }

  const daysUntilDue = getDaysUntilDate(expiresOn, referenceDate);

  if (!expiresOn || daysUntilDue === null) {
    return {
      key,
      label,
      status: "missing",
      expiresOn,
      daysUntilDue: null,
      message: `${label} expiration date is not set yet.`,
    };
  }

  if (daysUntilDue < 0) {
    const daysPastDue = Math.abs(daysUntilDue);
    return {
      key,
      label,
      status: "expired",
      expiresOn,
      daysUntilDue,
      message: `${label} expired ${daysPastDue} day${daysPastDue === 1 ? "" : "s"} ago.`,
    };
  }

  if (daysUntilDue <= documentAlertWindowDays) {
    return {
      key,
      label,
      status: "due_soon",
      expiresOn,
      daysUntilDue,
      message:
        daysUntilDue === 0
          ? `${label} expires today.`
          : `${label} expires in ${daysUntilDue} day${daysUntilDue === 1 ? "" : "s"}.`,
    };
  }

  return {
    key,
    label,
    status: "current",
    expiresOn,
    daysUntilDue,
    message: `${label} is current through ${expiresOn}.`,
  };
}

export function getComplianceDocumentAlerts(
  tracking: ComplianceDocumentTracking,
  referenceDate: Date = new Date()
): ComplianceDocumentAlert[] {
  return [
    buildDateAlert({
      key: "insurance",
      label: "Insurance",
      savedToGusto: tracking.insuranceSavedToGusto,
      expiresOn: tracking.insuranceExpiresOn,
      referenceDate,
    }),
    buildDateAlert({
      key: "drivers_license",
      label: "Driver’s license",
      savedToGusto: tracking.driversLicenseSavedToGusto,
      expiresOn: tracking.driversLicenseExpiresOn,
      referenceDate,
    }),
  ];
}

export function countConfirmedComplianceDocuments(
  tracking: ComplianceDocumentTracking
): number {
  return [
    tracking.w9SavedToGusto,
    tracking.contractSavedToGusto,
    tracking.insuranceSavedToGusto,
    tracking.driversLicenseSavedToGusto,
  ].filter(Boolean).length;
}

export function countActiveComplianceDocumentAlerts(
  alerts: ComplianceDocumentAlert[]
): number {
  return alerts.filter((alert) => alert.status !== "current").length;
}
