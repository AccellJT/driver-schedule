import { getAnswerText, isAnswerPresent } from "./answerHelpers";
import { getComplianceReviewerQuestionConfig } from "./reviewerAidConfig";
import {
  driverComplianceSurveyDefinition,
  getComplianceQuestionNumber,
} from "./surveySchema.v1";
import type {
  ComplianceAnswerValue,
  ComplianceAnswers,
  CompliancePreferredAnswer,
  ComplianceQuestion,
  ComplianceQuestionEvaluationResult,
  ComplianceReviewerAidSummary,
  ComplianceReviewerSeverity,
  ComplianceSuggestedDecision,
  ComplianceSurveyDefinition,
} from "./types";

function getQuestionAnswer(
  answers: ComplianceAnswers,
  question: ComplianceQuestion
): ComplianceAnswerValue | undefined {
  return answers[question.section]?.[question.id] ?? answers[question.section]?.[question.key];
}

function normalizeBooleanAnswer(value: ComplianceAnswerValue | undefined): boolean | null {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["yes", "true", "1"].includes(normalized)) return true;
    if (["no", "false", "0"].includes(normalized)) return false;
  }

  return null;
}

function matchesPreferredAnswer(
  actualAnswer: ComplianceAnswerValue | undefined,
  preferredAnswer: CompliancePreferredAnswer
): boolean {
  if (preferredAnswer === "completed") {
    return isAnswerPresent(actualAnswer);
  }

  const normalizedBoolean = normalizeBooleanAnswer(actualAnswer);
  if (normalizedBoolean === null) {
    return false;
  }

  return preferredAnswer === "yes" ? normalizedBoolean : !normalizedBoolean;
}

function getPreferredAnswerLabel(preferredAnswer: CompliancePreferredAnswer): string {
  switch (preferredAnswer) {
    case "yes":
      return "Yes";
    case "no":
      return "No";
    default:
      return "Completed";
  }
}

function getActualAnswerLabel(
  actualAnswer: ComplianceAnswerValue | undefined,
  preferredAnswer: CompliancePreferredAnswer
): string {
  if (preferredAnswer === "completed") {
    return isAnswerPresent(actualAnswer) ? getAnswerText(actualAnswer) : "Not completed";
  }

  return getAnswerText(actualAnswer);
}

function buildCompiledReviewerNote(evaluation: ComplianceQuestionEvaluationResult): string {
  const questionToken = evaluation.questionNumber ? `Q${evaluation.questionNumber}` : "Review item";

  return [
    `${questionToken} — ${evaluation.questionLabel}`,
    `Preferred response: ${evaluation.preferredAnswerLabel}`,
    `Submitted response: ${evaluation.actualAnswerLabel}`,
    evaluation.cannedReviewerNote ?? "",
  ]
    .filter(Boolean)
    .join("\n");
}

function getSuggestedDecisionLabel(decision: ComplianceSuggestedDecision): string {
  switch (decision) {
    case "approve":
      return "Approve";
    case "request_changes":
      return "Request changes";
    default:
      return "Request changes or reject";
  }
}

function buildRecommendationSummary({
  mismatchCount,
  blockingMismatchCount,
  highMismatchCount,
  mediumMismatchCount,
  lowMismatchCount,
  suggestedDecision,
}: {
  mismatchCount: number;
  blockingMismatchCount: number;
  highMismatchCount: number;
  mediumMismatchCount: number;
  lowMismatchCount: number;
  suggestedDecision: ComplianceSuggestedDecision;
}): string {
  if (suggestedDecision === "approve") {
    return "No preferred-response mismatches were detected in this packet. Approval is the current suggested next step.";
  }

  const segments = [
    blockingMismatchCount > 0 ? `${blockingMismatchCount} blocking` : null,
    highMismatchCount > 0 ? `${highMismatchCount} high` : null,
    mediumMismatchCount > 0 ? `${mediumMismatchCount} medium` : null,
    lowMismatchCount > 0 ? `${lowMismatchCount} low` : null,
  ].filter((value): value is string => Boolean(value));

  const severitySummary = segments.length > 0 ? segments.join(", ") : `${mismatchCount} review item(s)`;

  return suggestedDecision === "request_changes_or_reject"
    ? `The packet includes ${severitySummary} mismatch(es). Request changes or reject is the suggested next step, subject to reviewer judgment and the total relationship context.`
    : `The packet includes ${severitySummary} mismatch(es). Request changes is the suggested next step, subject to reviewer judgment and the total relationship context.`;
}

export function evaluateComplianceReviewerAid({
  answers,
  surveyDefinition = driverComplianceSurveyDefinition,
}: {
  answers: ComplianceAnswers;
  surveyDefinition?: ComplianceSurveyDefinition;
}): ComplianceReviewerAidSummary {
  const evaluations: ComplianceQuestionEvaluationResult[] = [];

  for (const section of surveyDefinition.sections) {
    for (const question of section.questions) {
      const config = getComplianceReviewerQuestionConfig(question.id);
      if (!config) {
        continue;
      }

      const actualAnswer = getQuestionAnswer(answers, question);
      const matched = matchesPreferredAnswer(actualAnswer, config.preferredAnswer);

      evaluations.push({
        questionId: question.id,
        sectionKey: question.section,
        questionNumber: getComplianceQuestionNumber(question.section, question.id),
        questionLabel: question.label,
        preferredAnswer: config.preferredAnswer,
        preferredAnswerLabel: getPreferredAnswerLabel(config.preferredAnswer),
        actualAnswer,
        actualAnswerLabel: getActualAnswerLabel(actualAnswer, config.preferredAnswer),
        matchesPreferredAnswer: matched,
        severity: matched ? null : config.mismatchSeverity,
        autoResponseCategory: matched ? "accepted_preferred" : config.mismatchCategory,
        cannedReviewerNote: matched ? null : config.cannedReviewerNote,
      });
    }
  }

  const mismatches = evaluations.filter((evaluation) => !evaluation.matchesPreferredAnswer);
  const blockingMismatchCount = mismatches.filter((item) => item.severity === "blocking").length;
  const highMismatchCount = mismatches.filter((item) => item.severity === "high").length;
  const mediumMismatchCount = mismatches.filter((item) => item.severity === "medium").length;
  const lowMismatchCount = mismatches.filter((item) => item.severity === "low").length;

  const suggestedDecision: ComplianceSuggestedDecision =
    blockingMismatchCount > 0
      ? "request_changes_or_reject"
      : mismatches.length > 0
      ? "request_changes"
      : "approve";

  const cannedReviewerNotes = mismatches.map((evaluation) => buildCompiledReviewerNote(evaluation));

  return {
    evaluations,
    mismatches,
    cannedReviewerNotes,
    compiledReviewerNote: cannedReviewerNotes.join("\n\n"),
    mismatchCount: mismatches.length,
    blockingMismatchCount,
    highMismatchCount,
    mediumMismatchCount,
    lowMismatchCount,
    suggestedDecision,
    suggestedDecisionLabel: getSuggestedDecisionLabel(suggestedDecision),
    recommendationSummary: buildRecommendationSummary({
      mismatchCount: mismatches.length,
      blockingMismatchCount,
      highMismatchCount,
      mediumMismatchCount,
      lowMismatchCount,
      suggestedDecision,
    }),
  };
}

export function hasReviewerAidSeverity(
  severity: ComplianceReviewerSeverity | null,
  expectedSeverity: ComplianceReviewerSeverity
): boolean {
  return severity === expectedSeverity;
}
