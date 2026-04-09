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
}

export interface ComplianceCompletionData {
  submission: ComplianceSubmission;
  expiration: ComplianceExpirationInfo;
}
