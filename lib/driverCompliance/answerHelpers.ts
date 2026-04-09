import type {
  ComplianceAnswerValue,
  ComplianceAnswers,
  ComplianceSectionKey,
} from "./types";

export function isAnswerPresent(value: ComplianceAnswerValue | undefined): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (typeof value === "number") return Number.isFinite(value);
  if (typeof value === "boolean") return true;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

export function getSectionAnswers(
  answers: ComplianceAnswers,
  sectionKey: ComplianceSectionKey
): Record<string, ComplianceAnswerValue> {
  return answers[sectionKey] ?? {};
}

export function getAnswerText(value: ComplianceAnswerValue | undefined): string {
  if (value === null || value === undefined) return "Not provided";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.length > 0 ? value.join(", ") : "Not provided";
  return value.trim().length > 0 ? value : "Not provided";
}

export function getBooleanAnswer(
  answers: ComplianceAnswers,
  sectionKey: ComplianceSectionKey,
  questionKey: string
): boolean {
  return answers[sectionKey]?.[questionKey] === true;
}

export function getNumberAnswer(
  answers: ComplianceAnswers,
  sectionKey: ComplianceSectionKey,
  questionKey: string
): number {
  const value = answers[sectionKey]?.[questionKey];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function normalizeAnswers(answers: ComplianceAnswers): ComplianceAnswers {
  return Object.fromEntries(
    Object.entries(answers).map(([sectionKey, sectionAnswers]) => [
      sectionKey,
      Object.fromEntries(
        Object.entries(sectionAnswers ?? {}).filter(([, value]) => value !== undefined)
      ),
    ])
  ) as ComplianceAnswers;
}
