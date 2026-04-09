import { isAnswerPresent } from "./answerHelpers";
import type {
  ComplianceAnswers,
  ComplianceSectionDefinition,
  ComplianceSectionProgress,
} from "./types";

export function getSectionProgress(
  section: ComplianceSectionDefinition,
  answers: ComplianceAnswers,
  updatedAt: string | null
): ComplianceSectionProgress {
  const sectionAnswers = answers[section.key] ?? {};
  const totalQuestions = section.questions.length;
  const answeredQuestions = section.questions.filter((question) => {
    return isAnswerPresent(sectionAnswers[question.key]);
  }).length;

  const completionPercent =
    totalQuestions === 0 ? 100 : Math.round((answeredQuestions / totalQuestions) * 100);

  return {
    key: section.key,
    title: section.title,
    description: section.description,
    totalQuestions,
    answeredQuestions,
    completionPercent,
    completed: completionPercent === 100,
    updatedAt,
  };
}

export function buildSectionProgress(
  sections: ComplianceSectionDefinition[],
  answers: ComplianceAnswers,
  updatedAt: string | null
): ComplianceSectionProgress[] {
  return sections.map((section) => getSectionProgress(section, answers, updatedAt));
}

export function getOverallComplianceProgress(sections: ComplianceSectionProgress[]): number {
  if (sections.length === 0) return 0;

  const total = sections.reduce((sum, section) => sum + section.completionPercent, 0);
  return Math.round(total / sections.length);
}
