"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import { AdminDecisionPanel } from "@/components/driverCompliance/AdminDecisionPanel";
import { ComplianceRecordNav } from "@/components/driverCompliance/ComplianceRecordNav";
import { ComplianceStatusBadge } from "@/components/driverCompliance/ComplianceStatusBadge";
import { RiskFlagList } from "@/components/driverCompliance/RiskFlagList";
import {
  evaluateComplianceReviewerAid,
  getComplianceReviewData,
  type ComplianceReviewData,
  type ComplianceReviewerAutoResponseCategory,
  type ComplianceReviewerSeverity,
} from "@/lib/driverCompliance";

const severityClassMap: Record<ComplianceReviewerSeverity, string> = {
  blocking:
    "border-red-400 bg-red-100 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-100",
  high: "border-orange-300 bg-orange-50 text-orange-800 dark:border-orange-900 dark:bg-orange-950 dark:text-orange-100",
  medium:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  low: "border-blue-300 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-100",
};

const categoryLabelMap: Record<ComplianceReviewerAutoResponseCategory, string> = {
  accepted_preferred: "Preferred response received",
  accepted_but_review: "Accepted but review",
  requires_clarification: "Requires clarification",
  missing_documentation: "Missing documentation",
  blocking_misalignment: "Blocking misalignment",
};

export default function DriverComplianceReviewPage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = use(params);
  const [reviewData, setReviewData] = useState<ComplianceReviewData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const result = await getComplianceReviewData(driverId);
        if (isActive) {
          setReviewData(result);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load compliance review data."
          );
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [driverId]);

  const reviewAid = useMemo(() => {
    if (!reviewData) {
      return null;
    }

    return evaluateComplianceReviewerAid({
      answers: reviewData.submission.answers,
    });
  }, [reviewData]);

  if (!reviewData && !errorMessage) {
    return (
      <main className="mx-auto max-w-7xl p-4 text-sm text-zinc-600 dark:text-zinc-300 sm:p-6 lg:p-8">
        Loading compliance review...
      </main>
    );
  }

  if (!reviewData || !reviewAid) {
    return (
      <main className="mx-auto max-w-3xl p-4 text-zinc-900 dark:text-zinc-100 sm:p-6 lg:p-8">
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {errorMessage ?? "Unable to load compliance review data."}
        </div>
      </main>
    );
  }

  const { submission, auditEntries } = reviewData;

  return (
    <main className="mx-auto max-w-7xl p-4 text-zinc-900 dark:text-zinc-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Link
              href={`/compliance/${driverId}`}
              className="text-sm text-blue-600 hover:underline dark:text-blue-400"
            >
              ← Back to packet
            </Link>
            <ComplianceStatusBadge status={submission.status} />
          </div>

          <h1 className="text-2xl font-semibold">Compliance Review</h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            Review workspace for {submission.driverName}.
          </p>
        </div>

        <ComplianceRecordNav driverId={driverId} activeView="review" />
      </div>

      {errorMessage && (
        <div className="mb-6 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      <div className="mb-6 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Eligibility</div>
          <div className="mt-1 text-lg font-semibold">{submission.eligibilityStatus}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Score</div>
          <div className="mt-1 text-lg font-semibold">{submission.score}/100</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Flags</div>
          <div className="mt-1 text-lg font-semibold">{submission.flags.length}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Auto mismatches</div>
          <div className="mt-1 text-lg font-semibold">{reviewAid.mismatchCount}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Blocking</div>
          <div className="mt-1 text-lg font-semibold">{reviewAid.blockingMismatchCount}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          <div className="text-sm text-zinc-600 dark:text-zinc-300">Suggested next step</div>
          <div className="mt-1 text-lg font-semibold">{reviewAid.suggestedDecisionLabel}</div>
        </div>
      </div>

      <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Automated reviewer guidance
          </h2>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            These internal review aids compare submitted responses to the preferred review profile.
            They do not determine worker status on their own and should be considered with the full
            relationship context.
          </p>
        </div>

        {reviewAid.mismatches.length === 0 ? (
          <div className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200">
            No preferred-response mismatches were detected in this submitted packet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-[980px] divide-y divide-zinc-200 text-sm dark:divide-zinc-800">
              <thead>
                <tr className="text-left text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  <th className="px-3 py-2">Question</th>
                  <th className="px-3 py-2">Preferred response</th>
                  <th className="px-3 py-2">Submitted response</th>
                  <th className="px-3 py-2">Severity</th>
                  <th className="px-3 py-2">Auto-response category</th>
                  <th className="px-3 py-2">Canned reviewer note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-900">
                {reviewAid.mismatches.map((item) => (
                  <tr key={item.questionId} className="align-top">
                    <td className="px-3 py-3">
                      <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                        Q{item.questionNumber ?? "?"}
                      </div>
                      <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                        {item.questionLabel}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-zinc-700 dark:text-zinc-200">
                      {item.preferredAnswerLabel}
                    </td>
                    <td className="px-3 py-3 text-zinc-700 dark:text-zinc-200">
                      {item.actualAnswerLabel}
                    </td>
                    <td className="px-3 py-3">
                      {item.severity && (
                        <span
                          className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${severityClassMap[item.severity]}`}
                        >
                          {item.severity}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <span className="inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-2.5 py-1 text-[11px] font-semibold text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
                        {categoryLabelMap[item.autoResponseCategory]}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-zinc-700 dark:text-zinc-200">
                      <div className="whitespace-pre-line leading-6">{item.cannedReviewerNote}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <RiskFlagList flags={submission.flags} />
        <AdminDecisionPanel
          driverId={driverId}
          eligibilityStatus={submission.eligibilityStatus}
          reviewDueAt={submission.reviewDueAt}
          reviewAid={reviewAid}
          onDecisionRecorded={(updatedData) => {
            setReviewData(updatedData);
            setErrorMessage(null);
          }}
        />
      </div>

      <section className="mt-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Audit trail</h2>
        <div className="mt-4 space-y-3">
          {auditEntries.map((entry) => (
            <div
              key={entry.id}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="font-medium text-zinc-900 dark:text-zinc-100">{entry.action}</div>
                <div className="text-xs text-zinc-500 dark:text-zinc-400">{entry.at}</div>
              </div>
              <div className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{entry.actor}</div>
              {entry.note && (
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{entry.note}</p>
              )}
            </div>
          ))}

          {auditEntries.length === 0 && (
            <div className="text-sm text-zinc-600 dark:text-zinc-300">
              No audit entries have been recorded yet.
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
