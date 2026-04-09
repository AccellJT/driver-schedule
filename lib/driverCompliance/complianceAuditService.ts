import type {
  ComplianceAuditEntry,
  ComplianceSubmission,
} from "./types";

export function buildComplianceAuditTrail(
  submission: ComplianceSubmission
): ComplianceAuditEntry[] {
  const entries: ComplianceAuditEntry[] = [
    {
      id: `${submission.id}-created`,
      action: "Packet created",
      actor: "System",
      at: submission.lastUpdatedAt,
      note: "Initial scaffold packet prepared for UI integration.",
    },
  ];

  if (submission.submittedAt) {
    entries.push({
      id: `${submission.id}-submitted`,
      action: "Submitted for review",
      actor: submission.driverName,
      at: submission.submittedAt,
      note: "Driver submitted the packet for compliance review.",
    });
  }

  if (submission.reviewDueAt) {
    entries.push({
      id: `${submission.id}-review`,
      action: "Review due",
      actor: "Compliance team",
      at: submission.reviewDueAt,
      note: "Administrative follow-up should happen by this date.",
    });
  }

  if (
    (submission.status === "approved" || submission.status === "conditionally_approved") &&
    submission.expiresAt
  ) {
    entries.push({
      id: `${submission.id}-approved`,
      action:
        submission.status === "conditionally_approved"
          ? "Conditionally approved"
          : "Approved",
      actor: "Compliance reviewer",
      at: submission.lastUpdatedAt,
      note: `Approval currently runs through ${submission.expiresAt}.`,
    });
  }

  if (submission.status === "review_required" || submission.status === "blocked") {
    entries.push({
      id: `${submission.id}-${submission.status}`,
      action:
        submission.status === "blocked" ? "Blocked" : "Review required",
      actor: "Compliance reviewer",
      at: submission.lastUpdatedAt,
      note: submission.notes ?? "Driver action is required before approval.",
    });
  }

  return entries.sort((a, b) => b.at.localeCompare(a.at));
}
