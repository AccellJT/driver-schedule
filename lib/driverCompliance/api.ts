import { supabase } from "@/lib/supabase";
import { isAnswerPresent, normalizeAnswers } from "./answerHelpers";
import { buildComplianceAuditTrail } from "./complianceAuditService";
import {
  calculateComplianceExpirationDate,
  getComplianceExpirationInfo,
  isComplianceExpired,
} from "./expirationService";
import { determineEligibilityStatus } from "./eligibilityService";
import { deriveComplianceFlags } from "./flagService";
import { calculateComplianceScore, evaluateComplianceSubmission } from "./scoringService";
import { complianceReviewWindowDays } from "./scoringRules.v1";
import {
  complianceSectionOrder,
  DRIVER_COMPLIANCE_SURVEY_VERSION,
  driverComplianceSurveySchema,
} from "./surveySchema.v1";
import { buildSectionProgress, getOverallComplianceProgress } from "./sectionProgress";
import type {
  ComplianceAnswers,
  ComplianceAuditEntry,
  ComplianceCompletionData,
  ComplianceDashboardData,
  ComplianceFlag,
  ComplianceReviewData,
  ComplianceStatus,
  ComplianceSubmission,
  ComplianceViewerAccess,
  DriverComplianceSummary,
  EligibilityStatus,
} from "./types";

type DriverRow = {
  id: string;
  full_name: string | null;
  email?: string | null;
  active?: boolean | null;
  is_blocked?: boolean | null;
  approval_status?: string | null;
};

type ProfileRow = {
  id: string;
  driver_id: string;
  current_submission_id: string | null;
  compliance_status: string | null;
  eligibility_status: string | null;
  current_score: number | null;
  risk_flags: unknown;
  missing_requirements: unknown;
  submitted_at: string | null;
  reviewed_at: string | null;
  approved_at: string | null;
  expires_at: string | null;
  updated_at: string;
};

type SubmissionRow = {
  id: string;
  driver_id: string;
  submission_version: number;
  survey_version: string | null;
  compliance_status: string | null;
  eligibility_status: string | null;
  score: number | null;
  answers: unknown;
  derived_flags: unknown;
  summary: unknown;
  submitted_at: string | null;
  review_due_at: string | null;
  expires_at: string | null;
  created_at: string;
  updated_at: string;
};

type AuditLogRow = {
  id: string;
  event_type: string;
  actor_profile_id: string | null;
  note: string | null;
  created_at: string;
  event_metadata: unknown;
};

type ProfileNameRow = {
  id: string;
  name?: string | null;
  role?: string | null;
};

type ComplianceAccessContext = {
  userId: string | null;
  role: string | null;
  driverId: string | null;
  isAdmin: boolean;
};

type ReviewDecisionAction = "approve" | "request_changes" | "reject";

const complianceStatuses: ComplianceStatus[] = [
  "not_started",
  "in_progress",
  "submitted",
  "review_required",
  "approved",
  "conditionally_approved",
  "blocked",
  "expired",
];

const eligibilityStatuses: EligibilityStatus[] = [
  "eligible",
  "review_required",
  "ineligible",
];

function toIsoDate(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function titleCase(value: string) {
  return value
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseAnswers(value: unknown): ComplianceAnswers {
  return isPlainObject(value) ? (value as ComplianceAnswers) : {};
}

function parseFlags(value: unknown): ComplianceFlag[] {
  if (!Array.isArray(value)) return [];

  return value.filter((item): item is ComplianceFlag => {
    return (
      isPlainObject(item) &&
      typeof item.code === "string" &&
      typeof item.title === "string" &&
      typeof item.description === "string" &&
      typeof item.severity === "string" &&
      typeof item.section === "string"
    );
  });
}

function getSummaryNote(value: unknown): string | null {
  if (!isPlainObject(value)) return null;

  const note = value.note ?? value.notes ?? value.summary;
  return typeof note === "string" && note.trim().length > 0 ? note : null;
}

function coerceComplianceStatus(
  value: string | null | undefined,
  fallback: ComplianceStatus = "not_started"
): ComplianceStatus {
  return value && complianceStatuses.includes(value as ComplianceStatus)
    ? (value as ComplianceStatus)
    : fallback;
}

function coerceEligibilityStatus(
  value: string | null | undefined,
  fallback: EligibilityStatus = "ineligible"
): EligibilityStatus {
  return value && eligibilityStatuses.includes(value as EligibilityStatus)
    ? (value as EligibilityStatus)
    : fallback;
}

function buildEmptySubmission(driverId: string, driverName: string): ComplianceSubmission {
  const answers: ComplianceAnswers = Object.fromEntries(
    complianceSectionOrder.map((sectionKey) => [sectionKey, {}])
  ) as ComplianceAnswers;

  const lastUpdatedAt = toIsoDate(new Date());
  const sections = buildSectionProgress(driverComplianceSurveySchema, answers, lastUpdatedAt);

  return {
    id: `draft-${driverId}`,
    driverId,
    driverName,
    status: "not_started",
    eligibilityStatus: "ineligible",
    version: `Submission 1 • Survey ${DRIVER_COMPLIANCE_SURVEY_VERSION}`,
    submissionVersion: 1,
    surveyVersion: DRIVER_COMPLIANCE_SURVEY_VERSION,
    isDraft: true,
    progress: getOverallComplianceProgress(sections),
    score: 0,
    submittedAt: null,
    reviewDueAt: null,
    expiresAt: null,
    lastUpdatedAt,
    notes: null,
    sectionOrder: [...complianceSectionOrder],
    sections,
    flags: [],
    answers,
  };
}

async function getComplianceAccessContext(): Promise<ComplianceAccessContext> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) {
    throw new Error(userError.message);
  }

  if (!user) {
    return { userId: null, role: null, driverId: null, isAdmin: false };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, driver_id")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    throw new Error(profileError.message);
  }

  const role = String(profile?.role ?? "").trim().toLowerCase() || null;
  const driverId = typeof profile?.driver_id === "string" ? profile.driver_id : null;
  const isAdmin = role === "admin";

  return {
    userId: user.id,
    role,
    driverId,
    isAdmin,
  };
}

function ensureAuthenticated(context: ComplianceAccessContext) {
  if (!context.userId) {
    throw new Error("You must be signed in to access driver compliance.");
  }
}

function assertCanAccessDriver(driverId: string, context: ComplianceAccessContext) {
  ensureAuthenticated(context);

  if (!context.isAdmin && context.driverId !== driverId) {
    throw new Error("You are not authorized to access this driver compliance record.");
  }
}

function assertCanReviewCompliance(context: ComplianceAccessContext) {
  ensureAuthenticated(context);

  if (!context.isAdmin) {
    throw new Error("Only admins can review or update compliance decisions.");
  }
}

function assertDriverCanEditDraft(driverId: string, context: ComplianceAccessContext) {
  ensureAuthenticated(context);

  if (context.role !== "driver" || context.driverId !== driverId) {
    throw new Error("Only the linked driver can update or delete this compliance draft.");
  }
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function getReviewDecisionConfig(action: ReviewDecisionAction): {
  status: ComplianceStatus;
  label: string;
  eventType: string;
  requiresNote: boolean;
} {
  switch (action) {
    case "approve":
      return {
        status: "approved",
        label: "Approved",
        eventType: "review.approved",
        requiresNote: false,
      };
    case "request_changes":
      return {
        status: "review_required",
        label: "Changes requested",
        eventType: "review.changes_requested",
        requiresNote: true,
      };
    case "reject":
      return {
        status: "blocked",
        label: "Rejected",
        eventType: "review.rejected",
        requiresNote: true,
      };
    default:
      return {
        status: "review_required",
        label: "Review updated",
        eventType: "review.updated",
        requiresNote: false,
      };
  }
}

function getMissingRequirements(answers: ComplianceAnswers): string[] {
  return driverComplianceSurveySchema.flatMap((section) => {
    const sectionAnswers = answers[section.key] ?? {};

    return section.questions
      .filter((question) => question.required && !isAnswerPresent(sectionAnswers[question.key]))
      .map((question) => question.label);
  });
}

async function getDraftSubmissionRow(driverId: string): Promise<SubmissionRow | null> {
  const { data, error } = await supabase
    .from("driver_compliance_submissions")
    .select(
      "id, driver_id, submission_version, survey_version, compliance_status, eligibility_status, score, answers, derived_flags, summary, submitted_at, review_due_at, expires_at, created_at, updated_at"
    )
    .eq("driver_id", driverId)
    .is("submitted_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as SubmissionRow | null;
}

async function getLatestSubmittedSubmissionRow(driverId: string): Promise<SubmissionRow | null> {
  const { data, error } = await supabase
    .from("driver_compliance_submissions")
    .select(
      "id, driver_id, submission_version, survey_version, compliance_status, eligibility_status, score, answers, derived_flags, summary, submitted_at, review_due_at, expires_at, created_at, updated_at"
    )
    .eq("driver_id", driverId)
    .not("submitted_at", "is", null)
    .order("submitted_at", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? null) as SubmissionRow | null;
}

async function getNextSubmissionVersion(driverId: string): Promise<number> {
  const { data, error } = await supabase
    .from("driver_compliance_submissions")
    .select("submission_version")
    .eq("driver_id", driverId)
    .order("submission_version", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data?.submission_version ?? 0) + 1;
}

async function syncComplianceProfileSummary({
  driverId,
  submissionId,
  actorProfileId,
  status,
  eligibilityStatus,
  score,
  flags,
  missingRequirements,
  submittedAt = null,
  reviewedAt = null,
  approvedAt = null,
  expiresAt = null,
}: {
  driverId: string;
  submissionId: string;
  actorProfileId: string | null;
  status: ComplianceStatus;
  eligibilityStatus: EligibilityStatus;
  score: number;
  flags: ComplianceFlag[];
  missingRequirements: string[];
  submittedAt?: string | null;
  reviewedAt?: string | null;
  approvedAt?: string | null;
  expiresAt?: string | null;
}) {
  const { error } = await supabase.from("driver_compliance_profiles").upsert(
    {
      driver_id: driverId,
      current_submission_id: submissionId,
      compliance_status: status,
      eligibility_status: eligibilityStatus,
      current_score: score,
      risk_flags: flags,
      missing_requirements: missingRequirements,
      submitted_at: submittedAt,
      reviewed_at: reviewedAt,
      approved_at: approvedAt,
      expires_at: expiresAt,
      last_actor_profile_id: actorProfileId,
    },
    { onConflict: "driver_id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function getComplianceViewerAccess(
  targetDriverId: string
): Promise<ComplianceViewerAccess> {
  const context = await getComplianceAccessContext();
  assertCanAccessDriver(targetDriverId, context);

  const isOwnDriverView = context.role === "driver" && context.driverId === targetDriverId;
  const [draftSubmission, latestSubmittedSubmission] = isOwnDriverView
    ? await Promise.all([
        getDraftSubmissionRow(targetDriverId),
        getLatestSubmittedSubmissionRow(targetDriverId),
      ])
    : [null, null];

  return {
    role: context.role,
    driverId: context.driverId,
    isAdmin: context.isAdmin,
    canEditDraft: isOwnDriverView && (!latestSubmittedSubmission || Boolean(draftSubmission)),
    canStartNewVersion: isOwnDriverView && Boolean(latestSubmittedSubmission) && !draftSubmission,
    canReview: context.isAdmin,
  };
}

function mapSubmissionToViewModel({
  driver,
  profile,
  submission,
  preferProfileState = true,
}: {
  driver: DriverRow | null;
  profile: ProfileRow | null;
  submission: SubmissionRow | null;
  preferProfileState?: boolean;
}): ComplianceSubmission {
  const driverId = submission?.driver_id ?? profile?.driver_id ?? driver?.id ?? "unknown-driver";
  const driverName = driver?.full_name?.trim() || titleCase(driverId);

  if (!submission && !profile) {
    return buildEmptySubmission(driverId, driverName);
  }

  const answers = parseAnswers(submission?.answers);
  const notes =
    getSummaryNote(submission?.summary) ??
    (Array.isArray(profile?.missing_requirements)
      ? (profile?.missing_requirements as string[]).join(", ")
      : null);

  const lastUpdatedAt = preferProfileState
    ? profile?.updated_at ?? submission?.updated_at ?? toIsoDate(new Date())
    : submission?.updated_at ?? profile?.updated_at ?? toIsoDate(new Date());
  const sections = buildSectionProgress(driverComplianceSurveySchema, answers, lastUpdatedAt);
  const progress = getOverallComplianceProgress(sections);
  const expiresAt = preferProfileState
    ? profile?.expires_at ?? submission?.expires_at ?? null
    : submission?.expires_at ?? profile?.expires_at ?? null;

  const derivedFlags = parseFlags(
    preferProfileState ? profile?.risk_flags ?? submission?.derived_flags : submission?.derived_flags
  );
  const flags = derivedFlags.length > 0 ? derivedFlags : deriveComplianceFlags({ answers, expiresAt });

  const fallbackStatus = submission?.submitted_at ? "submitted" : progress > 0 ? "in_progress" : "not_started";
  const status = coerceComplianceStatus(
    preferProfileState
      ? profile?.compliance_status ?? submission?.compliance_status
      : submission?.compliance_status ?? profile?.compliance_status,
    fallbackStatus
  );

  const scoreSource = preferProfileState ? profile?.current_score ?? submission?.score : submission?.score ?? profile?.current_score;
  const score =
    typeof scoreSource === "number" ? scoreSource : calculateComplianceScore({ answers, sections, flags });

  const eligibilityStatus = coerceEligibilityStatus(
    preferProfileState
      ? profile?.eligibility_status ?? submission?.eligibility_status
      : submission?.eligibility_status ?? profile?.eligibility_status,
    determineEligibilityStatus({ status, score, flags })
  );

  const annualReviewDue =
    Boolean(expiresAt) &&
    isComplianceExpired(expiresAt) &&
    ["approved", "conditionally_approved", "expired"].includes(status);
  const effectiveStatus: ComplianceStatus = annualReviewDue ? "review_required" : status;
  const effectiveEligibilityStatus: EligibilityStatus = annualReviewDue
    ? "review_required"
    : eligibilityStatus;
  const expiresAtLabel = typeof expiresAt === "string" ? expiresAt.split("T")[0] : null;
  const effectiveReviewDueAt =
    annualReviewDue || ["approved", "conditionally_approved"].includes(status)
      ? expiresAt
      : submission?.review_due_at ?? null;
  const effectiveNotes = annualReviewDue
    ? notes ??
      `Annual review is required. This approval was effective through ${expiresAtLabel ?? "the prior approval date"}. Start a new submission version to continue eligibility.`
    : notes;

  const submissionVersion = submission?.submission_version ?? 1;
  const surveyVersion = submission?.survey_version ?? DRIVER_COMPLIANCE_SURVEY_VERSION;

  return {
    id: submission?.id ?? profile?.current_submission_id ?? `draft-${driverId}`,
    driverId,
    driverName,
    status: effectiveStatus,
    eligibilityStatus: effectiveEligibilityStatus,
    version: `Submission ${submissionVersion} • Survey ${surveyVersion}`,
    submissionVersion,
    surveyVersion,
    isDraft: !submission?.submitted_at,
    progress,
    score,
    submittedAt: submission?.submitted_at ?? (preferProfileState ? profile?.submitted_at : null) ?? null,
    reviewDueAt: effectiveReviewDueAt,
    expiresAt,
    lastUpdatedAt,
    notes: effectiveNotes,
    sectionOrder: [...complianceSectionOrder],
    sections,
    flags,
    answers,
  };
}

function toDashboardRow(submission: ComplianceSubmission): DriverComplianceSummary {
  return {
    driverId: submission.driverId,
    driverName: submission.driverName,
    status: submission.status,
    eligibilityStatus: submission.eligibilityStatus,
    progress: submission.progress,
    expiresAt: submission.expiresAt,
    flagCount: submission.flags.length,
    highRiskFlagCount: submission.flags.filter((flag) => flag.severity === "high").length,
    lastUpdatedAt: submission.lastUpdatedAt,
  };
}

function formatEventLabel(eventType: string): string {
  return eventType
    .split(/[._-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function toAuditEntries(
  rows: AuditLogRow[],
  actorNames: Map<string, string>
): ComplianceAuditEntry[] {
  return rows.map((row) => ({
    id: row.id,
    action: formatEventLabel(row.event_type),
    actor: row.actor_profile_id ? (actorNames.get(row.actor_profile_id) ?? "Staff") : "System",
    at: row.created_at,
    note: row.note ?? undefined,
  }));
}

export async function getComplianceDashboardData(): Promise<ComplianceDashboardData> {
  const context = await getComplianceAccessContext();
  ensureAuthenticated(context);

  if (!context.isAdmin && !context.driverId) {
    throw new Error("Only admins or linked driver accounts can access driver compliance.");
  }

  let driversQuery = supabase
    .from("drivers")
    .select("id, full_name, email, active, is_blocked, approval_status")
    .order("full_name", { ascending: true });

  let profilesQuery = supabase.from("driver_compliance_profiles").select(
    "id, driver_id, current_submission_id, compliance_status, eligibility_status, current_score, risk_flags, missing_requirements, submitted_at, reviewed_at, approved_at, expires_at, updated_at"
  );

  if (!context.isAdmin && context.driverId) {
    driversQuery = driversQuery.eq("id", context.driverId);
    profilesQuery = profilesQuery.eq("driver_id", context.driverId);
  }

  const [{ data: drivers, error: driversError }, { data: profiles, error: profilesError }] =
    await Promise.all([driversQuery, profilesQuery]);

  if (driversError) throw new Error(driversError.message);
  if (profilesError) throw new Error(profilesError.message);

  const driverRows = (drivers ?? []) as DriverRow[];
  const profileRows = (profiles ?? []) as ProfileRow[];
  const driverIds = driverRows.map((driver) => driver.id);

  const profileByDriverId = new Map(profileRows.map((profile) => [profile.driver_id, profile]));
  const latestSubmissionByDriverId = new Map<string, SubmissionRow>();

  if (driverIds.length > 0) {
    const { data: submissionRows, error: submissionsError } = await supabase
      .from("driver_compliance_submissions")
      .select(
        "id, driver_id, submission_version, survey_version, compliance_status, eligibility_status, score, answers, derived_flags, summary, submitted_at, review_due_at, expires_at, created_at, updated_at"
      )
      .in("driver_id", driverIds)
      .order("created_at", { ascending: false });

    if (submissionsError) throw new Error(submissionsError.message);

    for (const submission of (submissionRows ?? []) as SubmissionRow[]) {
      if (!latestSubmissionByDriverId.has(submission.driver_id)) {
        latestSubmissionByDriverId.set(submission.driver_id, submission);
      }
    }
  }

  const rows = driverRows
    .map((driver) => {
      const profile = profileByDriverId.get(driver.id) ?? null;
      const submission = latestSubmissionByDriverId.get(driver.id) ?? null;

      return toDashboardRow(mapSubmissionToViewModel({ driver, profile, submission }));
    })
    .sort((a, b) => {
      if (b.highRiskFlagCount !== a.highRiskFlagCount) {
        return b.highRiskFlagCount - a.highRiskFlagCount;
      }
      return b.lastUpdatedAt.localeCompare(a.lastUpdatedAt);
    });

  return {
    totalDrivers: rows.length,
    pendingReviewCount: rows.filter((row) => ["submitted", "review_required"].includes(row.status))
      .length,
    approvedCount: rows.filter((row) => ["approved", "conditionally_approved"].includes(row.status))
      .length,
    flaggedCount: rows.filter((row) => row.flagCount > 0).length,
    rows,
    isAdmin: context.isAdmin,
    viewerDriverId: context.driverId,
  };
}

export async function startNewComplianceVersion(driverId: string): Promise<ComplianceSubmission> {
  const context = await getComplianceAccessContext();
  assertDriverCanEditDraft(driverId, context);

  const [draftRow, latestSubmittedRow] = await Promise.all([
    getDraftSubmissionRow(driverId),
    getLatestSubmittedSubmissionRow(driverId),
  ]);

  if (draftRow) {
    return getComplianceSubmissionByDriverId(driverId);
  }

  const nextVersion = await getNextSubmissionVersion(driverId);
  const baseAnswers = latestSubmittedRow ? parseAnswers(latestSubmittedRow.answers) : {};
  const normalizedAnswers = normalizeAnswers(baseAnswers);
  const lastUpdatedAt = toIsoDate(new Date());
  const sections = buildSectionProgress(driverComplianceSurveySchema, normalizedAnswers, lastUpdatedAt);
  const { score, flags, recommendedStatus } = evaluateComplianceSubmission({
    answers: normalizedAnswers,
    sections,
  });
  const safeScore = Math.min(100, Math.max(0, score));
  const status: ComplianceStatus = recommendedStatus === "not_started" ? "not_started" : "in_progress";
  const eligibilityStatus = determineEligibilityStatus({ status, score: safeScore, flags });
  const missingRequirements = getMissingRequirements(normalizedAnswers);
  const progress = getOverallComplianceProgress(sections);
  const summary = {
    note: latestSubmittedRow
      ? "New draft started from the last submitted packet. Update answers and resubmit when ready."
      : "New compliance draft started.",
    missingRequirements,
    progress,
    priorSubmissionId: latestSubmittedRow?.id ?? null,
  };

  const { data: insertResult, error: insertError } = await supabase
    .from("driver_compliance_submissions")
    .insert({
      driver_id: driverId,
      submission_version: nextVersion,
      survey_version: DRIVER_COMPLIANCE_SURVEY_VERSION,
      compliance_status: status,
      eligibility_status: eligibilityStatus,
      score: safeScore,
      answers: normalizedAnswers,
      derived_flags: flags,
      summary,
      created_by_profile_id: context.userId,
      review_due_at: null,
      expires_at: null,
    })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);

  await syncComplianceProfileSummary({
    driverId,
    submissionId: insertResult.id,
    actorProfileId: context.userId,
    status,
    eligibilityStatus,
    score: safeScore,
    flags,
    missingRequirements,
  });

  const { error: auditError } = await supabase.from("driver_compliance_audit_log").insert({
    driver_id: driverId,
    submission_id: insertResult.id,
    actor_profile_id: context.userId,
    event_type: "submission.version_started",
    compliance_status: status,
    eligibility_status: eligibilityStatus,
    note:
      nextVersion === 1
        ? "Driver started the initial compliance draft."
        : `Driver started a new compliance draft version (${nextVersion}).`,
    event_metadata: {
      submissionVersion: nextVersion,
      basedOnSubmissionId: latestSubmittedRow?.id ?? null,
    },
  });

  if (auditError) throw new Error(auditError.message);

  return getComplianceSubmissionByDriverId(driverId);
}

export async function saveComplianceDraft({
  driverId,
  answers,
}: {
  driverId: string;
  answers: ComplianceAnswers;
}): Promise<ComplianceSubmission> {
  const context = await getComplianceAccessContext();
  assertDriverCanEditDraft(driverId, context);

  let draftRow = await getDraftSubmissionRow(driverId);

  if (!draftRow) {
    await startNewComplianceVersion(driverId);
    draftRow = await getDraftSubmissionRow(driverId);
  }

  if (!draftRow) {
    throw new Error("Unable to create an editable compliance draft.");
  }

  if (draftRow.submitted_at) {
    throw new Error("Submitted compliance packets are immutable. Start a new version to make changes.");
  }

  const normalizedAnswers = normalizeAnswers(answers);
  const lastUpdatedAt = toIsoDate(new Date());
  const sections = buildSectionProgress(driverComplianceSurveySchema, normalizedAnswers, lastUpdatedAt);
  const { score, flags, recommendedStatus } = evaluateComplianceSubmission({
    answers: normalizedAnswers,
    sections,
  });
  const safeScore = Math.min(100, Math.max(0, score));

  const status: ComplianceStatus = recommendedStatus === "not_started" ? "not_started" : "in_progress";
  const eligibilityStatus = determineEligibilityStatus({ status, score: safeScore, flags });
  const missingRequirements = getMissingRequirements(normalizedAnswers);
  const progress = getOverallComplianceProgress(sections);
  const summary = {
    note:
      progress === 100
        ? "Draft saved. Your packet is complete and ready for final submission."
        : `Draft saved. ${missingRequirements.length} required item${missingRequirements.length === 1 ? "" : "s"} still need attention.`,
    missingRequirements,
    progress,
  };

  const { error: updateError } = await supabase
    .from("driver_compliance_submissions")
    .update({
      survey_version: DRIVER_COMPLIANCE_SURVEY_VERSION,
      compliance_status: status,
      eligibility_status: eligibilityStatus,
      score: safeScore,
      answers: normalizedAnswers,
      derived_flags: flags,
      summary,
      review_due_at: null,
      expires_at: null,
    })
    .eq("id", draftRow.id)
    .is("submitted_at", null);

  if (updateError) throw new Error(updateError.message);

  await syncComplianceProfileSummary({
    driverId,
    submissionId: draftRow.id,
    actorProfileId: context.userId,
    status,
    eligibilityStatus,
    score: safeScore,
    flags,
    missingRequirements,
  });

  return getComplianceSubmissionByDriverId(driverId);
}

export async function finalizeComplianceSubmission(driverId: string): Promise<ComplianceSubmission> {
  const context = await getComplianceAccessContext();
  assertDriverCanEditDraft(driverId, context);

  const draftRow = await getDraftSubmissionRow(driverId);

  if (!draftRow) {
    throw new Error("No editable draft was found to submit for review.");
  }

  const submission = mapSubmissionToViewModel({
    driver: null,
    profile: null,
    submission: draftRow,
    preferProfileState: false,
  });

  if (submission.submittedAt) {
    throw new Error("This compliance packet has already been submitted for review.");
  }

  if (submission.progress < 100) {
    throw new Error("Complete all required sections before submitting this packet for review.");
  }

  const safeScore = Math.min(100, Math.max(0, submission.score));
  const reviewDueAt = addDays(new Date(), complianceReviewWindowDays).toISOString();
  const nextStatus: ComplianceStatus = submission.flags.length > 0 ? "review_required" : "submitted";
  const eligibilityStatus = determineEligibilityStatus({
    status: nextStatus,
    score: safeScore,
    flags: submission.flags,
  });
  const missingRequirements = getMissingRequirements(submission.answers);
  const nowIso = new Date().toISOString();

  const { error: submitError } = await supabase
    .from("driver_compliance_submissions")
    .update({
      compliance_status: nextStatus,
      eligibility_status: eligibilityStatus,
      score: safeScore,
      submitted_at: nowIso,
      submitted_by_profile_id: context.userId,
      review_due_at: reviewDueAt,
      summary: {
        note: "Packet submitted for admin review.",
        missingRequirements,
        progress: submission.progress,
      },
    })
    .eq("id", draftRow.id)
    .is("submitted_at", null);

  if (submitError) throw new Error(submitError.message);

  await syncComplianceProfileSummary({
    driverId,
    submissionId: draftRow.id,
    actorProfileId: context.userId,
    status: nextStatus,
    eligibilityStatus,
    score: safeScore,
    flags: submission.flags,
    missingRequirements,
    submittedAt: nowIso,
    reviewedAt: null,
    approvedAt: null,
    expiresAt: null,
  });

  const { error: auditError } = await supabase.from("driver_compliance_audit_log").insert({
    driver_id: driverId,
    submission_id: draftRow.id,
    actor_profile_id: context.userId,
    event_type: "submission.submitted",
    compliance_status: nextStatus,
    eligibility_status: eligibilityStatus,
    note: "Driver submitted the packet for admin review.",
    event_metadata: {
      submissionVersion: draftRow.submission_version,
      reviewDueAt,
      progress: submission.progress,
      score: safeScore,
      flagCount: submission.flags.length,
    },
  });

  if (auditError) throw new Error(auditError.message);

  return getComplianceSubmissionByDriverId(driverId);
}

export async function submitComplianceForReview(driverId: string): Promise<ComplianceSubmission> {
  return finalizeComplianceSubmission(driverId);
}

export async function getComplianceSubmissionByDriverId(
  driverId: string
): Promise<ComplianceSubmission> {
  const context = await getComplianceAccessContext();
  assertCanAccessDriver(driverId, context);

  const [driverResult, profileResult, draftSubmission, latestSubmittedSubmission, feedbackResult] = await Promise.all([
    supabase
      .from("drivers")
      .select("id, full_name, email, active, is_blocked, approval_status")
      .eq("id", driverId)
      .maybeSingle(),
    supabase
      .from("driver_compliance_profiles")
      .select(
        "id, driver_id, current_submission_id, compliance_status, eligibility_status, current_score, risk_flags, missing_requirements, submitted_at, reviewed_at, approved_at, expires_at, updated_at"
      )
      .eq("driver_id", driverId)
      .maybeSingle(),
    getDraftSubmissionRow(driverId),
    getLatestSubmittedSubmissionRow(driverId),
    supabase
      .from("driver_compliance_audit_log")
      .select("id, event_type, actor_profile_id, note, created_at, event_metadata")
      .eq("driver_id", driverId)
      .in("event_type", ["review.changes_requested", "review.rejected", "review.approved"])
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  if (driverResult.error) throw new Error(driverResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);
  if (feedbackResult.error) throw new Error(feedbackResult.error.message);

  const driver = (driverResult.data ?? null) as DriverRow | null;
  const profile = (profileResult.data ?? null) as ProfileRow | null;
  const submission = draftSubmission ?? latestSubmittedSubmission ?? null;

  if (!driver && !profile && !submission) {
    throw new Error("Driver compliance record not found.");
  }

  const viewModel = mapSubmissionToViewModel({
    driver,
    profile,
    submission,
    preferProfileState:
      !submission || !submission.submitted_at || profile?.current_submission_id === submission.id,
  });
  const latestFeedbackNote = ((feedbackResult.data ?? []) as AuditLogRow[])
    .map((row) => row.note?.trim())
    .find((note): note is string => typeof note === "string" && note.length > 0);

  return latestFeedbackNote ? { ...viewModel, notes: latestFeedbackNote } : viewModel;
}

export async function reviewComplianceSubmission({
  driverId,
  action,
  note,
}: {
  driverId: string;
  action: ReviewDecisionAction;
  note: string;
}): Promise<ComplianceReviewData> {
  const context = await getComplianceAccessContext();
  assertCanReviewCompliance(context);

  const reviewConfig = getReviewDecisionConfig(action);
  const trimmedNote = note.trim();

  if (reviewConfig.requiresNote && trimmedNote.length === 0) {
    throw new Error("A reviewer note is required when requesting changes or rejecting a packet.");
  }

  const profileResult = await supabase
    .from("driver_compliance_profiles")
    .select(
      "id, driver_id, current_submission_id, compliance_status, eligibility_status, current_score, risk_flags, missing_requirements, submitted_at, reviewed_at, approved_at, expires_at, updated_at"
    )
    .eq("driver_id", driverId)
    .maybeSingle();

  if (profileResult.error) throw new Error(profileResult.error.message);

  const profile = (profileResult.data ?? null) as ProfileRow | null;
  const submissionRow = await getLatestSubmittedSubmissionRow(driverId);

  if (!submissionRow?.submitted_at) {
    throw new Error("A submitted compliance packet is required before an admin decision can be recorded.");
  }

  const submissionView = mapSubmissionToViewModel({
    driver: null,
    profile,
    submission: submissionRow,
    preferProfileState: profile?.current_submission_id === submissionRow.id,
  });

  const nowIso = new Date().toISOString();
  const expiresAt =
    reviewConfig.status === "approved" || reviewConfig.status === "conditionally_approved"
      ? calculateComplianceExpirationDate(nowIso)
      : null;
  const eligibilityStatus = determineEligibilityStatus({
    status: reviewConfig.status,
    score: submissionView.score,
    flags: submissionView.flags,
  });

  const { data: reviewRow, error: reviewError } = await supabase
    .from("driver_compliance_reviews")
    .insert({
      submission_id: submissionRow.id,
      driver_id: driverId,
      reviewer_profile_id: context.userId,
      decision: reviewConfig.status,
      decision_reason: reviewConfig.label,
      review_notes: trimmedNote || null,
      conditions:
        action === "request_changes"
          ? trimmedNote
              .split(/\n+/)
              .map((item) => item.trim())
              .filter(Boolean)
          : [],
      score_snapshot: submissionView.score,
      flags_snapshot: submissionView.flags,
    })
    .select("id")
    .single();

  if (reviewError) throw new Error(reviewError.message);

  await syncComplianceProfileSummary({
    driverId,
    submissionId: submissionRow.id,
    actorProfileId: context.userId,
    status: reviewConfig.status,
    eligibilityStatus,
    score: submissionView.score,
    flags: submissionView.flags,
    missingRequirements: getMissingRequirements(submissionView.answers),
    submittedAt: submissionView.submittedAt,
    reviewedAt: nowIso,
    approvedAt: reviewConfig.status === "approved" ? nowIso : null,
    expiresAt,
  });

  const { error: auditError } = await supabase.from("driver_compliance_audit_log").insert({
    driver_id: driverId,
    compliance_profile_id: profile?.id ?? null,
    submission_id: submissionRow.id,
    review_id: reviewRow.id,
    actor_profile_id: context.userId,
    event_type: reviewConfig.eventType,
    compliance_status: reviewConfig.status,
    eligibility_status: eligibilityStatus,
    note:
      trimmedNote ||
      (reviewConfig.status === "approved"
        ? `Admin approved this packet. It is effective through ${expiresAt?.split("T")[0] ?? "the next annual review"}.`
        : reviewConfig.status === "conditionally_approved"
        ? `Admin conditionally approved this packet. It is effective through ${expiresAt?.split("T")[0] ?? "the next annual review"}.`
        : reviewConfig.status === "review_required"
        ? "Admin requested changes to this packet."
        : "Admin rejected this packet."),
    event_metadata: {
      action,
      decision: reviewConfig.status,
      score: submissionView.score,
      flagCount: submissionView.flags.length,
      expiresAt,
      reviewWindowDays: reviewConfig.status === "review_required" ? complianceReviewWindowDays : null,
    },
  });

  if (auditError) throw new Error(auditError.message);

  return getComplianceReviewData(driverId);
}

export async function submitComplianceReviewDecision(args: {
  driverId: string;
  action: ReviewDecisionAction;
  note: string;
}): Promise<ComplianceReviewData> {
  return reviewComplianceSubmission(args);
}

export async function getComplianceReviewData(
  driverId: string
): Promise<ComplianceReviewData> {
  const context = await getComplianceAccessContext();
  assertCanReviewCompliance(context);

  const [driverResult, profileResult, latestSubmittedSubmission] = await Promise.all([
    supabase
      .from("drivers")
      .select("id, full_name, email, active, is_blocked, approval_status")
      .eq("id", driverId)
      .maybeSingle(),
    supabase
      .from("driver_compliance_profiles")
      .select(
        "id, driver_id, current_submission_id, compliance_status, eligibility_status, current_score, risk_flags, missing_requirements, submitted_at, reviewed_at, approved_at, expires_at, updated_at"
      )
      .eq("driver_id", driverId)
      .maybeSingle(),
    getLatestSubmittedSubmissionRow(driverId),
  ]);

  if (driverResult.error) throw new Error(driverResult.error.message);
  if (profileResult.error) throw new Error(profileResult.error.message);

  if (!latestSubmittedSubmission?.submitted_at) {
    throw new Error("No submitted compliance packet is available for review yet.");
  }

  const submission = mapSubmissionToViewModel({
    driver: (driverResult.data ?? null) as DriverRow | null,
    profile: (profileResult.data ?? null) as ProfileRow | null,
    submission: latestSubmittedSubmission,
    preferProfileState:
      ((profileResult.data ?? null) as ProfileRow | null)?.current_submission_id ===
      latestSubmittedSubmission.id,
  });

  const { data: auditRows, error: auditError } = await supabase
    .from("driver_compliance_audit_log")
    .select("id, event_type, actor_profile_id, note, created_at, event_metadata")
    .eq("driver_id", driverId)
    .order("created_at", { ascending: false })
    .limit(25);

  if (auditError) throw new Error(auditError.message);

  const actorIds = [...new Set(((auditRows ?? []) as AuditLogRow[])
    .map((row) => row.actor_profile_id)
    .filter((value): value is string => typeof value === "string" && value.length > 0))];

  const actorNameMap = new Map<string, string>();

  if (actorIds.length > 0) {
    const { data: actorRows } = await supabase
      .from("profiles")
      .select("id, name, role")
      .in("id", actorIds);

    ((actorRows ?? []) as ProfileNameRow[]).forEach((row) => {
      actorNameMap.set(row.id, row.name?.trim() || row.role?.trim() || "Staff");
    });
  }

  const auditEntries =
    (auditRows ?? []).length > 0
      ? toAuditEntries((auditRows ?? []) as AuditLogRow[], actorNameMap)
      : buildComplianceAuditTrail(submission);

  return {
    submission,
    auditEntries,
  };
}

export async function getComplianceCompletionData(
  driverId: string
): Promise<ComplianceCompletionData> {
  const submission = await getComplianceSubmissionByDriverId(driverId);
  return {
    submission,
    expiration: getComplianceExpirationInfo(submission),
  };
}
