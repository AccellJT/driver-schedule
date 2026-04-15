import { isAnswerPresent } from "./answerHelpers";
import {
  deriveComplianceFlags,
  hasBlockingComplianceFlags,
} from "./flagService";
import {
  complianceFlagPenaltyBySeverity,
  complianceRiskThresholds,
  complianceSectionWeights,
} from "./scoringRules.v1";
import { driverComplianceSurveyDefinition } from "./surveySchema.v1";
import type {
  ComplianceAnswerValue,
  ComplianceAnswers,
  ComplianceFlag,
  ComplianceQuestion,
  ComplianceSectionProgress,
  ComplianceSurveyDefinition,
  ComplianceStatus,
} from "./types";

export type RecommendedComplianceStatus =
  | ComplianceStatus
  | "review_required"
  | "conditionally_approved"
  | "blocked";

function getQuestionAnswer(
  answers: ComplianceAnswers,
  question: ComplianceQuestion
): ComplianceAnswerValue | undefined {
  return answers[question.section]?.[question.id] ?? answers[question.section]?.[question.key];
}

function clampScore(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)));
}

function getAnsweredQuestionCount(
  answers: ComplianceAnswers,
  surveyDefinition: ComplianceSurveyDefinition
): number {
  return surveyDefinition.sections.reduce((total, section) => {
    return (
      total +
      section.questions.filter((question) => isAnswerPresent(getQuestionAnswer(answers, question)))
        .length
    );
  }, 0);
}

function getRequiredQuestionCompletion(
  answers: ComplianceAnswers,
  surveyDefinition: ComplianceSurveyDefinition
) {
  return surveyDefinition.sections.reduce(
    (acc, section) => {
      for (const question of section.questions) {
        if (!question.required) continue;

        acc.totalRequiredQuestions += 1;

        if (isAnswerPresent(getQuestionAnswer(answers, question))) {
          acc.answeredRequiredQuestions += 1;
        }
      }

      return acc;
    },
    { totalRequiredQuestions: 0, answeredRequiredQuestions: 0 }
  );
}

function hasHighRiskCombination(flags: ComplianceFlag[]): boolean {
  const highCount = flags.filter((flag) => flag.severity === "high").length;
  const mediumCount = flags.filter((flag) => flag.severity === "medium").length;

  return (
    highCount >= complianceRiskThresholds.highRiskCombinationCount ||
    mediumCount >= complianceRiskThresholds.mediumRiskCombinationCount
  );
}

function isFlaggedQuestion(question: ComplianceQuestion, flags: ComplianceFlag[]): boolean {
  return flags.some((flag) => flag.questionId === question.id);
}

function getMaximumPossibleScore(surveyDefinition: ComplianceSurveyDefinition) {
  return surveyDefinition.sections.reduce((total, section) => {
    const multiplier = complianceSectionWeights[section.key] ?? 1;
    const sectionScore = section.questions.reduce((sectionTotal, question) => {
      return sectionTotal + (question.weight ?? 1) * multiplier;
    }, 0);

    return total + sectionScore;
  }, 0);
}

export function calculateComplianceReviewScore({
  answers,
  flags,
  surveyDefinition = driverComplianceSurveyDefinition,
}: {
  answers: ComplianceAnswers;
  flags?: ComplianceFlag[];
  surveyDefinition?: ComplianceSurveyDefinition;
}) {
  const effectiveFlags = flags ?? deriveComplianceFlags({ answers, surveyDefinition });
  const maxScore = getMaximumPossibleScore(surveyDefinition);

  if (maxScore <= 0) {
    return 0;
  }

  const earnedScore = surveyDefinition.sections.reduce((total, section) => {
    const multiplier = complianceSectionWeights[section.key] ?? 1;

    const sectionScore = section.questions.reduce((sectionTotal, question) => {
      const answer = getQuestionAnswer(answers, question);

      if (!isAnswerPresent(answer) || isFlaggedQuestion(question, effectiveFlags)) {
        return sectionTotal;
      }

      return sectionTotal + (question.weight ?? 1) * multiplier;
    }, 0);

    return total + sectionScore;
  }, 0);

  let score = Math.round((earnedScore / maxScore) * 100);

  for (const flag of effectiveFlags) {
    score -= complianceFlagPenaltyBySeverity[flag.severity];
  }

  return clampScore(score);
}

/**
 * Score is calculated from the config-driven survey schema, not from page-level logic.
 * A question contributes its configured weight only when it has an answer and that
 * answer does not trigger one of the question's own `riskIf` rules.
 */
export function calculateComplianceScore({
  answers,
  sections,
  flags,
  surveyDefinition = driverComplianceSurveyDefinition,
}: {
  answers: ComplianceAnswers;
  sections?: ComplianceSectionProgress[];
  flags?: ComplianceFlag[];
  surveyDefinition?: ComplianceSurveyDefinition;
}): number {
  const effectiveFlags =
    flags ?? deriveComplianceFlags({ answers, surveyDefinition });

  let score = surveyDefinition.sections.reduce((total, section) => {
    const multiplier = complianceSectionWeights[section.key] ?? 1;

    const sectionScore = section.questions.reduce((sectionTotal, question) => {
      const answer = getQuestionAnswer(answers, question);

      if (!isAnswerPresent(answer) || isFlaggedQuestion(question, effectiveFlags)) {
        return sectionTotal;
      }

      return sectionTotal + (question.weight ?? 1) * multiplier;
    }, 0);

    return total + sectionScore;
  }, 0);

  if (sections && sections.length > 0) {
    const completionBonus = sections.reduce((total, section) => {
      return total + section.completionPercent / 100;
    }, 0);
    score += completionBonus;
  }

  for (const flag of effectiveFlags) {
    score -= complianceFlagPenaltyBySeverity[flag.severity];
  }

  return clampScore(score);
}

/**
 * Recommended status is derived from answer completeness, score thresholds,
 * blocking flags, and expiration state.
 */
export function deriveRecommendedComplianceStatus({
  answers,
  submittedAt = null,
  expiresAt = null,
  score,
  flags,
  sections,
  surveyDefinition = driverComplianceSurveyDefinition,
  referenceDate = new Date(),
}: {
  answers: ComplianceAnswers;
  submittedAt?: string | null;
  expiresAt?: string | null;
  score?: number;
  flags?: ComplianceFlag[];
  sections?: ComplianceSectionProgress[];
  surveyDefinition?: ComplianceSurveyDefinition;
  referenceDate?: Date;
}): RecommendedComplianceStatus {
  if (expiresAt) {
    const expirationDate = new Date(expiresAt);
    if (!Number.isNaN(expirationDate.getTime()) && expirationDate.getTime() < referenceDate.getTime()) {
      return "expired";
    }
  }

  const answeredQuestionCount = getAnsweredQuestionCount(answers, surveyDefinition);
  if (answeredQuestionCount === 0) {
    return "not_started";
  }

  const { totalRequiredQuestions, answeredRequiredQuestions } = getRequiredQuestionCompletion(
    answers,
    surveyDefinition
  );

  if (!submittedAt) {
    return "in_progress";
  }

  if (answeredRequiredQuestions < totalRequiredQuestions) {
    return "submitted";
  }

  const effectiveFlags =
    flags ?? deriveComplianceFlags({ answers, surveyDefinition, expiresAt, referenceDate });
  const effectiveScore =
    score ?? calculateComplianceScore({ answers, sections, flags: effectiveFlags, surveyDefinition });

  if (
    hasBlockingComplianceFlags(effectiveFlags) ||
    effectiveScore < complianceRiskThresholds.reviewRequiredMin
  ) {
    return "blocked";
  }

  if (
    effectiveScore <= complianceRiskThresholds.reviewRequiredMaxScore ||
    hasHighRiskCombination(effectiveFlags)
  ) {
    return "review_required";
  }

  if (effectiveFlags.length > 0) {
    return "conditionally_approved";
  }

  return "approved";
}

export function evaluateComplianceSubmission({
  answers,
  submittedAt = null,
  expiresAt = null,
  sections,
  surveyDefinition = driverComplianceSurveyDefinition,
  referenceDate = new Date(),
}: {
  answers: ComplianceAnswers;
  submittedAt?: string | null;
  expiresAt?: string | null;
  sections?: ComplianceSectionProgress[];
  surveyDefinition?: ComplianceSurveyDefinition;
  referenceDate?: Date;
}) {
  const flags = deriveComplianceFlags({ answers, surveyDefinition, expiresAt, referenceDate });
  const score = calculateComplianceScore({ answers, sections, flags, surveyDefinition });
  const recommendedStatus = deriveRecommendedComplianceStatus({
    answers,
    submittedAt,
    expiresAt,
    score,
    flags,
    sections,
    surveyDefinition,
    referenceDate,
  });

  return {
    score,
    flags,
    recommendedStatus,
  };
}
