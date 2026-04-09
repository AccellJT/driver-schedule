import Link from "next/link";
import type { ComplianceStatus, EligibilityStatus } from "@/lib/driverCompliance";

const compactLabelMap: Record<ComplianceStatus, string> = {
  not_started: "None",
  in_progress: "Draft",
  submitted: "Submitted",
  review_required: "Review",
  approved: "Approved",
  conditionally_approved: "Conditional",
  blocked: "Blocked",
  expired: "Expired",
};

const compactClassMap: Record<ComplianceStatus, string> = {
  not_started: "border-zinc-300 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
  in_progress: "border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200",
  submitted: "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
  review_required: "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
  approved: "border-green-300 bg-green-50 text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200",
  conditionally_approved: "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  blocked: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
  expired: "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200",
};

function formatShortDate(value: string | null | undefined) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString([], {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

export function ComplianceCompactStatus({
  status,
  eligibilityStatus,
  expiresAt,
  href,
}: {
  status?: ComplianceStatus | null;
  eligibilityStatus?: EligibilityStatus | null;
  expiresAt?: string | null;
  href?: string;
}) {
  const effectiveStatus: ComplianceStatus =
    eligibilityStatus === "review_required"
      ? "review_required"
      : status ?? "not_started";

  const badge = (
    <span
      className={`inline-flex rounded-full border px-1.5 py-0.5 text-[10px] font-medium ${compactClassMap[effectiveStatus]}`}
      title={
        eligibilityStatus === "review_required" && expiresAt
          ? `Annual review due ${formatShortDate(expiresAt)}`
          : expiresAt && ["approved", "conditionally_approved"].includes(effectiveStatus)
          ? `Approved through ${formatShortDate(expiresAt)}`
          : `Compliance ${compactLabelMap[effectiveStatus]}`
      }
    >
      C: {compactLabelMap[effectiveStatus]}
    </span>
  );

  if (href) {
    return (
      <Link href={href} className="inline-flex">
        {badge}
      </Link>
    );
  }

  return badge;
}
