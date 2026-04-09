import type {
  ComplianceFlagSeverity,
  ComplianceSectionKey,
} from "./types";

/**
 * Section multipliers allow the score to remain config-driven while giving
 * slightly more influence to control, money, and attestation questions.
 */
export const complianceSectionWeights: Record<ComplianceSectionKey, number> = {
  identity: 1,
  control: 1.15,
  separation: 1.1,
  money: 1.15,
  operations: 1.1,
  attestation: 1.2,
  documents: 1,
  safety: 1,
  vehicle: 1,
};

export const complianceScoreThresholds = {
  approvedMin: 24,
  reviewRequiredMin: 12,
} as const;

/**
 * Backward-compatible aliases for older callers in this repo.
 */
export const complianceRiskThresholds = {
  approvedMin: complianceScoreThresholds.approvedMin,
  reviewRequiredMin: complianceScoreThresholds.reviewRequiredMin,
  ineligibleMaxScore: complianceScoreThresholds.reviewRequiredMin - 1,
  reviewRequiredMaxScore: complianceScoreThresholds.approvedMin - 1,
  highRiskCombinationCount: 1,
  mediumRiskCombinationCount: 2,
} as const;

export const complianceFlagPenaltyBySeverity: Record<ComplianceFlagSeverity, number> = {
  low: 1,
  medium: 3,
  high: 6,
};

/**
 * These flags should prevent automatic approval even when the raw score is high.
 */
export const complianceBlockingFlagCodes = [
  "cannot_decline_work",
  "not_free_to_work_for_others",
  "employee_type_benefits_reported",
  "company_set_start_times",
  "missing_w9",
  "license_or_docs_not_maintained",
  "insurance_not_maintained",
  "truthfulness_not_certified",
  "signature_missing",
] as const;

export type ComplianceBlockingFlagCode =
  (typeof complianceBlockingFlagCodes)[number];

export const complianceReviewWindowDays = 14;
export const complianceApprovalWindowDays = 365;
