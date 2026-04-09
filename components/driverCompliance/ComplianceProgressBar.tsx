import type {
  ComplianceSectionKey,
  ComplianceSectionProgress,
} from "@/lib/driverCompliance";

export function ComplianceProgressBar({
  progress,
  sections,
  activeSectionKey,
}: {
  progress: number;
  sections: ComplianceSectionProgress[];
  activeSectionKey?: ComplianceSectionKey;
}) {
  const activeSection = sections.find((section) => section.key === activeSectionKey);
  const completedSections = sections.filter((section) => section.completed).length;

  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
            Packet progress
          </h2>
          <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
            {completedSections}/{sections.length} sections complete
            {activeSection ? ` • Currently editing ${activeSection.title}` : ""}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-2.5 py-1 text-sm font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200">
          {progress}% complete
        </span>
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-full rounded-full bg-blue-600 transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
