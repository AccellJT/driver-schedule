import { isAnswerPresent } from "./answerHelpers";
import {
  complianceBlockingFlagCodes,
} from "./scoringRules.v1";
import { driverComplianceSurveyDefinition } from "./surveySchema.v1";
import type {
  ComplianceAnswerValue,
  ComplianceAnswers,
  ComplianceFlag,
  ComplianceQuestion,
  ComplianceRiskIf,
  ComplianceSurveyDefinition,
} from "./types";

function normalizeString(value: string) {
  return value.trim().toLowerCase();
}

function toBooleanValue(value: ComplianceAnswerValue | undefined): boolean | null {
  if (typeof value === "boolean") return value;

  if (typeof value === "string") {
    const normalized = normalizeString(value);
    if (["yes", "true", "1"].includes(normalized)) return true;
    if (["no", "false", "0"].includes(normalized)) return false;
  }

  return null;
}

function areAnswersEqual(
  answer: ComplianceAnswerValue | undefined,
  expected: ComplianceAnswerValue
): boolean {
  if (expected === null) {
    return !isAnswerPresent(answer);
  }

  const answerBoolean = toBooleanValue(answer);
  const expectedBoolean = toBooleanValue(expected);

  if (answerBoolean !== null && expectedBoolean !== null) {
    return answerBoolean === expectedBoolean;
  }

  if (Array.isArray(answer) && Array.isArray(expected)) {
    return (
      answer.length === expected.length &&
      answer.every(
        (item, index) => normalizeString(String(item)) === normalizeString(String(expected[index]))
      )
    );
  }

  return normalizeString(String(answer ?? "")) === normalizeString(String(expected));
}

function answerIncludes(
  answer: ComplianceAnswerValue | undefined,
  expected: string
): boolean {
  if (!isAnswerPresent(answer)) return false;

  if (Array.isArray(answer)) {
    return answer.some((item) => normalizeString(String(item)) === normalizeString(expected));
  }

  if (typeof answer === "string") {
    return normalizeString(answer).includes(normalizeString(expected));
  }

  return false;
}

function getQuestionAnswer(
  answers: ComplianceAnswers,
  question: ComplianceQuestion
): ComplianceAnswerValue | undefined {
  return answers[question.section]?.[question.id] ?? answers[question.section]?.[question.key];
}

function buildFlag(question: ComplianceQuestion, rule: ComplianceRiskIf): ComplianceFlag {
  return {
    code: rule.code,
    title: question.label,
    description: rule.message,
    severity: rule.severity,
    section: question.section,
    questionId: question.id,
  };
}

function getDaysUntil(dateString: string, referenceDate: Date) {
  const target = new Date(dateString);
  const diffMs = target.getTime() - referenceDate.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function doesRiskRuleMatch(
  answer: ComplianceAnswerValue | undefined,
  rule: ComplianceRiskIf
): boolean {
  if (rule.equals !== undefined && areAnswersEqual(answer, rule.equals)) {
    return true;
  }

  if (rule.includes !== undefined && answerIncludes(answer, rule.includes)) {
    return true;
  }

  return false;
}

export function isBlockingComplianceFlag(flag: Pick<ComplianceFlag, "code">): boolean {
  return complianceBlockingFlagCodes.some((code) => code === flag.code);
}

export function hasBlockingComplianceFlags(flags: ComplianceFlag[]): boolean {
  return flags.some((flag) => isBlockingComplianceFlag(flag));
}

export function deriveComplianceFlags({
  answers,
  surveyDefinition = driverComplianceSurveyDefinition,
  expiresAt = null,
  referenceDate = new Date(),
}: {
  answers: ComplianceAnswers;
  surveyDefinition?: ComplianceSurveyDefinition;
  expiresAt?: string | null;
  referenceDate?: Date;
}): ComplianceFlag[] {
  const flagMap = new Map<string, ComplianceFlag>();

  for (const section of surveyDefinition.sections) {
    for (const question of section.questions) {
      const answer = getQuestionAnswer(answers, question);

      for (const rule of question.riskIf ?? []) {
        if (doesRiskRuleMatch(answer, rule)) {
          flagMap.set(rule.code, buildFlag(question, rule));
        }
      }
    }
  }

  if (expiresAt) {
    const daysUntilExpiration = getDaysUntil(expiresAt, referenceDate);

    if (daysUntilExpiration < 0) {
      flagMap.set("packet_expired", {
        code: "packet_expired",
        title: "Compliance packet expired",
        description: "This compliance packet is already past its expiration date.",
        severity: "high",
        section: "attestation",
      });
    } else if (daysUntilExpiration <= 30) {
      flagMap.set("packet_expiring_soon", {
        code: "packet_expiring_soon",
        title: "Compliance packet expiring soon",
        description: "The compliance packet will expire within 30 days.",
        severity: "low",
        section: "attestation",
      });
    }
  }

  return [...flagMap.values()];
}
