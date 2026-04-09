import type { ComplianceStatus } from "@/lib/driverCompliance";

const statusLabelMap: Record<ComplianceStatus, string> = {
  not_started: "Not started",
  in_progress: "In progress",
  submitted: "Submitted",
  review_required: "Review required",
  approved: "Approved",
  conditionally_approved: "Conditionally approved",
  blocked: "Blocked",
  expired: "Expired",
};

const statusClassMap: Record<ComplianceStatus, string> = {
  not_started: "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  in_progress: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  submitted: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  review_required: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200",
  conditionally_approved: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  blocked: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  expired: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
};

export function ComplianceStatusBadge({ status }: { status: ComplianceStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-medium ${statusClassMap[status]}`}
    >
      {statusLabelMap[status]}
    </span>
  );
}
