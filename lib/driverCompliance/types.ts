export type ComplianceStatus =
  | "not_started"
  | "in_progress"
  | "submitted"
  | "review_required"
  | "approved"
  | "conditionally_approved"
  | "blocked"
  | "expired";

export type EligibilityStatus =
  | "eligible"
  | "review_required"
  | "ineligible";

export type ComplianceSectionKey =
  | "identity"
  | "control"
  | "separation"
  | "money"
  | "operations"
  | "attestation"
  | "documents"
  | "safety"
  | "vehicle"
  | (string & {});

export type ComplianceFlagSeverity = "low" | "medium" | "high";

export type ComplianceReviewerSeverity = ComplianceFlagSeverity | "blocking";

export type ComplianceReviewerAutoResponseCategory =
  | "accepted_preferred"
  | "accepted_but_review"
  | "requires_clarification"
  | "missing_documentation"
  | "blocking_misalignment";

export type CompliancePreferredAnswer = "yes" | "no" | "completed";

export type ComplianceSuggestedDecision =
  | "approve"
  | "request_changes"
  | "request_changes_or_reject";

export type ComplianceQuestionType =
  | "yes_no"
  | "text"
  | "textarea"
  | "select"
  | "multiselect"
  | "file"
  | "signature";

export type ComplianceAnswerValue = string | number | boolean | string[] | null;

export type ComplianceAnswerMap = Partial<
  Record<ComplianceSectionKey, Record<string, ComplianceAnswerValue>>
>;

export interface ComplianceQuestionOption {
  value: string;
  label: string;
  description?: string;
}

export interface ComplianceRiskIf {
  equals?: ComplianceAnswerValue;
  includes?: string;
  severity: ComplianceFlagSeverity;
  code: string;
  message: string;
}

export interface ComplianceQuestion {
  id: string;
  key: string;
  section: ComplianceSectionKey;
  prompt: string;
  label: string;
  required: boolean;
  type: ComplianceQuestionType;
  description?: string;
  placeholder?: string;
  weight?: number;
  riskIf?: ComplianceRiskIf[];
  options?: ComplianceQuestionOption[];
}

export interface ComplianceReviewerQuestionConfig {
  preferredAnswer: CompliancePreferredAnswer;
  mismatchSeverity: ComplianceReviewerSeverity;
  mismatchCategory: Exclude<ComplianceReviewerAutoResponseCategory, "accepted_preferred">;
  cannedReviewerNote: string;
}

export interface ComplianceQuestionEvaluationResult {
  questionId: string;
  sectionKey: ComplianceSectionKey;
  questionNumber: number | null;
  questionLabel: string;
  preferredAnswer: CompliancePreferredAnswer;
  preferredAnswerLabel: string;
  actualAnswer: ComplianceAnswerValue | undefined;
  actualAnswerLabel: string;
  matchesPreferredAnswer: boolean;
  severity: ComplianceReviewerSeverity | null;
  autoResponseCategory: ComplianceReviewerAutoResponseCategory;
  cannedReviewerNote: string | null;
}

export interface ComplianceReviewerAidSummary {
  evaluations: ComplianceQuestionEvaluationResult[];
  mismatches: ComplianceQuestionEvaluationResult[];
  cannedReviewerNotes: string[];
  compiledReviewerNote: string;
  mismatchCount: number;
  blockingMismatchCount: number;
  highMismatchCount: number;
  mediumMismatchCount: number;
  lowMismatchCount: number;
  suggestedDecision: ComplianceSuggestedDecision;
  suggestedDecisionLabel: string;
  recommendationSummary: string;
}

export interface ComplianceDocumentTracking {
  w9SavedToGusto: boolean;
  contractSavedToGusto: boolean;
  insuranceSavedToGusto: boolean;
  insuranceExpiresOn: string | null;
  driversLicenseSavedToGusto: boolean;
  driversLicenseExpiresOn: string | null;
  updatedAt: string | null;
}

export type ComplianceDocumentAlertStatus =
  | "current"
  | "due_soon"
  | "expired"
  | "missing";

export interface ComplianceDocumentAlert {
  key: "insurance" | "drivers_license";
  label: string;
  status: ComplianceDocumentAlertStatus;
  expiresOn: string | null;
  daysUntilDue: number | null;
  message: string;
}

export interface ComplianceSection {
  key: ComplianceSectionKey;
  title: string;
  description: string;
  questions: ComplianceQuestion[];
}

export interface ComplianceSurveyDefinition {
  version: string;
  title: string;
  description: string;
  sectionOrder: ComplianceSectionKey[];
  sections: ComplianceSection[];
}

export type ComplianceQuestionDefinition = ComplianceQuestion;
export type ComplianceSectionDefinition = ComplianceSection;
export type ComplianceAnswers = ComplianceAnswerMap;

export interface ComplianceFlag {
  code: string;
  title: string;
  description: string;
  severity: ComplianceFlagSeverity;
  section: ComplianceSectionKey;
  questionId?: string;
}

export interface ComplianceSectionProgress {
  key: ComplianceSectionKey;
  title: string;
  description: string;
  totalQuestions: number;
  answeredQuestions: number;
  completionPercent: number;
  completed: boolean;
  updatedAt: string | null;
}

export interface ComplianceSubmission {
  id: string;
  driverId: string;
  driverName: string;
  status: ComplianceStatus;
  eligibilityStatus: EligibilityStatus;
  version: string;
  submissionVersion: number;
  surveyVersion: string;
  isDraft: boolean;
  progress: number;
  score: number;
  submittedAt: string | null;
  reviewDueAt: string | null;
  expiresAt: string | null;
  lastUpdatedAt: string;
  notes: string | null;
  sectionOrder: ComplianceSectionKey[];
  sections: ComplianceSectionProgress[];
  flags: ComplianceFlag[];
  answers: ComplianceAnswerMap;
}

export interface DriverComplianceSummary {
  driverId: string;
  driverName: string;
  status: ComplianceStatus;
  eligibilityStatus: EligibilityStatus;
  progress: number;
  expiresAt: string | null;
  flagCount: number;
  highRiskFlagCount: number;
  lastUpdatedAt: string;
  documentTracking: ComplianceDocumentTracking;
  documentAlerts: ComplianceDocumentAlert[];
  documentAlertCount: number;
  gustoConfirmedCount: number;
}

export type ComplianceDashboardRow = DriverComplianceSummary;

export interface ComplianceDashboardData {
  totalDrivers: number;
  pendingReviewCount: number;
  approvedCount: number;
  flaggedCount: number;
  rows: DriverComplianceSummary[];
  isAdmin: boolean;
  viewerDriverId: string | null;
}

export interface ComplianceViewerAccess {
  role: string | null;
  driverId: string | null;
  isAdmin: boolean;
  canEditDraft: boolean;
  canStartNewVersion: boolean;
  canReview: boolean;
}

export interface ComplianceAuditEntry {
  id: string;
  action: string;
  actor: string;
  at: string;
  note?: string;
}

export interface ComplianceExpirationInfo {
  expiresAt: string | null;
  isExpired: boolean;
  daysUntilExpiration: number | null;
  label: string;
}

export interface ComplianceReviewData {
  submission: ComplianceSubmission;
  auditEntries: ComplianceAuditEntry[];
  documentTracking: ComplianceDocumentTracking;
  documentAlerts: ComplianceDocumentAlert[];
}

export interface ComplianceCompletionData {
  submission: ComplianceSubmission;
  expiration: ComplianceExpirationInfo;
}
