import {
  getComplianceQuestionNumber,
  getComplianceSectionDefinition,
  type ComplianceFlag,
} from "@/lib/driverCompliance";

const severityClassMap = {
  low: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  medium:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  high: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
} as const;

export function RiskFlagList({ flags }: { flags: ComplianceFlag[] }) {
  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Risk flags</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Reviewer-facing issues derived from the scaffold ruleset.
        </p>
      </div>

      {flags.length === 0 ? (
        <div className="rounded-lg border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          No flags are currently raised for this driver.
        </div>
      ) : (
        <div className="space-y-3">
          {flags.map((flag) => {
            const questionNumber = flag.questionId
              ? getComplianceQuestionNumber(flag.section, flag.questionId)
              : null;
            const sectionTitle = getComplianceSectionDefinition(flag.section)?.title ?? flag.section;

            return (
              <div
                key={flag.code}
                className={`rounded-lg border p-3 ${severityClassMap[flag.severity]}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-wide opacity-80">
                      {questionNumber && (
                        <span className="rounded-full border border-current px-2 py-1">
                          Q{questionNumber}
                        </span>
                      )}
                      <span>{sectionTitle}</span>
                    </div>
                    <h3 className="text-sm font-semibold">{flag.title}</h3>
                    <p className="mt-1 text-sm">{flag.description}</p>
                  </div>
                  <span className="rounded-full border border-current px-2 py-1 text-[10px] font-semibold uppercase tracking-wide">
                    {flag.severity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
