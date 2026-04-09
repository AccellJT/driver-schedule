import { hasBlockingComplianceFlags } from "./flagService";
import { complianceRiskThresholds } from "./scoringRules.v1";
import type { ComplianceFlag, ComplianceStatus, EligibilityStatus } from "./types";

type EligibilityInputStatus =
  | ComplianceStatus
  | "review_required"
  | "conditionally_approved"
  | "blocked";

function resolveLegacyStatus(
  score: number,
  flags: ComplianceFlag[]
): EligibilityInputStatus {
  const highRiskCount = flags.filter((flag) => flag.severity === "high").length;
  const mediumRiskCount = flags.filter((flag) => flag.severity === "medium").length;

  if (hasBlockingComplianceFlags(flags) || score < complianceRiskThresholds.reviewRequiredMin) {
    return "blocked";
  }

  if (
    score <= complianceRiskThresholds.reviewRequiredMaxScore ||
    highRiskCount >= complianceRiskThresholds.highRiskCombinationCount ||
    mediumRiskCount >= complianceRiskThresholds.mediumRiskCombinationCount
  ) {
    return "review_required";
  }

  return flags.length > 0 ? "conditionally_approved" : "approved";
}

/**
 * Eligibility is intentionally simpler than the compliance status model:
 * approved and conditionally approved are eligible, review_required stays
 * review_required, and everything else is ineligible.
 */
export function determineEligibilityStatus({
  recommendedStatus,
  status,
  score,
  flags = [],
}: {
  recommendedStatus?: EligibilityInputStatus;
  status?: EligibilityInputStatus;
  score?: number;
  flags?: ComplianceFlag[];
}): EligibilityStatus {
  const resolvedStatus =
    recommendedStatus ??
    status ??
    resolveLegacyStatus(score ?? 0, flags);

  switch (resolvedStatus) {
    case "approved":
    case "conditionally_approved":
      return "eligible";
    case "review_required":
      return "review_required";
    default:
      return "ineligible";
  }
}
