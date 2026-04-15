import {
  getAnswerText,
  getComplianceQuestionNumber,
  getComplianceReviewerQuestionConfig,
  isAnswerPresent,
  type ComplianceAnswerValue,
  type ComplianceAnswers,
  type ComplianceQuestionDefinition,
  type ComplianceSectionDefinition,
  type CompliancePreferredAnswer,
} from "@/lib/driverCompliance";

function toTextValue(value: ComplianceAnswerValue | undefined) {
  return typeof value === "string" ? value : "";
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
) {
  if (preferredAnswer === "completed") {
    return isAnswerPresent(actualAnswer);
  }

  const normalizedBoolean = normalizeBooleanAnswer(actualAnswer);
  if (normalizedBoolean === null) {
    return false;
  }

  return preferredAnswer === "yes" ? normalizedBoolean : !normalizedBoolean;
}

function getReviewerGuidance(
  questionKey: string,
  answer: ComplianceAnswerValue | undefined
): string | null {
  const config = getComplianceReviewerQuestionConfig(questionKey);
  if (!config) return null;

  if (matchesPreferredAnswer(answer, config.preferredAnswer)) {
    return null;
  }

  return config.cannedReviewerNote;
}

function QuestionRow({
  questionNumber,
  sectionKey,
  question,
  answer,
  readOnly,
  onAnswerChange,
}: {
  questionNumber: number;
  sectionKey: string;
  question: ComplianceQuestionDefinition;
  answer: ComplianceAnswerValue | undefined;
  readOnly: boolean;
  onAnswerChange?: (sectionKey: string, questionKey: string, value: ComplianceAnswerValue) => void;
}) {
  const commonClassName =
    "w-full rounded-xl border border-zinc-300 bg-white px-3 py-2.5 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100";
  const answered = isAnswerPresent(answer);

  function updateValue(value: ComplianceAnswerValue) {
    onAnswerChange?.(sectionKey, question.key, value);
  }

  function renderInput() {
    if (readOnly) {
      return (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          {getAnswerText(answer)}
        </div>
      );
    }

    switch (question.type) {
      case "yes_no":
        return (
          <div className="grid gap-2 sm:grid-cols-2" role="radiogroup" aria-label={question.label}>
            {[
              { label: "Yes", value: true },
              { label: "No", value: false },
            ].map((option) => {
              const selected = answer === option.value;

              return (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => updateValue(option.value)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-medium transition ${
                    selected
                      ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
                      : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        );
      case "textarea":
        return (
          <textarea
            value={toTextValue(answer)}
            onChange={(event) => updateValue(event.target.value || null)}
            placeholder={question.placeholder ?? "Enter your response"}
            className={`${commonClassName} min-h-28`}
          />
        );
      case "select":
        return (
          <select
            value={toTextValue(answer)}
            onChange={(event) => updateValue(event.target.value || null)}
            className={commonClassName}
          >
            <option value="">Select an option</option>
            {(question.options ?? []).map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        );
      case "multiselect":
        return (
          <div className="space-y-2 rounded-xl border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-950">
            {(question.options ?? []).map((option) => {
              const selected = Array.isArray(answer) ? answer : [];
              const checked = selected.includes(option.value);

              return (
                <label
                  key={option.value}
                  className="flex items-center gap-2 rounded-lg px-2 py-1 text-sm text-zinc-700 dark:text-zinc-200"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={(event) => {
                      const next = event.target.checked
                        ? [...selected, option.value]
                        : selected.filter((item) => item !== option.value);
                      updateValue(next);
                    }}
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        );
      case "file":
      case "signature":
      case "text":
      default:
        return (
          <input
            type="text"
            value={toTextValue(answer)}
            onChange={(event) => updateValue(event.target.value || null)}
            placeholder={
              question.placeholder ??
              (question.type === "file"
                ? "Paste a document reference or filename"
                : question.type === "signature"
                ? "Type your full name as acknowledgement"
                : "Enter your response")
            }
            className={commonClassName}
          />
        );
    }
  }

  const guidanceText = getReviewerGuidance(question.id, answer);

  return (
    <div
      id={`compliance-question-${sectionKey}-${question.key}`}
      className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950"
    >
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-zinc-900 px-2 text-[11px] font-semibold text-white dark:bg-zinc-100 dark:text-zinc-900">
              {questionNumber}
            </span>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              {question.label}
            </h3>
            {question.required && (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-200">
                Required
              </span>
            )}
          </div>

          {question.description && (
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{question.description}</p>
          )}
        </div>

        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
            answered
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {answered ? "Answered" : "Not answered"}
        </span>
      </div>

      {renderInput()}

      {guidanceText ? (
        <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">
          <div className="font-semibold">Clarification Needed</div>
          <p className="mt-2 leading-6">{guidanceText}</p>
        </div>
      ) : null}
    </div>
  );
}

export function ComplianceQuestionRenderer({
  section,
  answers,
  readOnly = true,
  onAnswerChange,
}: {
  section: ComplianceSectionDefinition;
  answers: ComplianceAnswers;
  readOnly?: boolean;
  onAnswerChange?: (sectionKey: string, questionKey: string, value: ComplianceAnswerValue) => void;
}) {
  const sectionAnswers = answers[section.key] ?? {};

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          {section.title}
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{section.description}</p>
      </div>

      <div className="space-y-3">
        {section.questions.map((question, index) => (
          <QuestionRow
            key={question.key}
            questionNumber={getComplianceQuestionNumber(section.key, question.id) ?? index + 1}
            sectionKey={section.key}
            question={question}
            answer={sectionAnswers[question.key]}
            readOnly={readOnly}
            onAnswerChange={onAnswerChange}
          />
        ))}
      </div>
    </section>
  );
}
