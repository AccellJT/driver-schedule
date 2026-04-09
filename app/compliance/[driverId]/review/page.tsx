"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { AdminDecisionPanel } from "@/components/driverCompliance/AdminDecisionPanel";
import { ComplianceRecordNav } from "@/components/driverCompliance/ComplianceRecordNav";
import { ComplianceStatusBadge } from "@/components/driverCompliance/ComplianceStatusBadge";
import { RiskFlagList } from "@/components/driverCompliance/RiskFlagList";
import {
  getComplianceReviewData,
  type ComplianceReviewData,
} from "@/lib/driverCompliance";

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

  if (!reviewData && !errorMessage) {
    return (
      <main className="mx-auto max-w-7xl p-4 text-sm text-zinc-600 dark:text-zinc-300 sm:p-6 lg:p-8">
        Loading compliance review...
      </main>
    );
  }

  if (!reviewData) {
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

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
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
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.1fr,0.9fr]">
        <RiskFlagList flags={submission.flags} />
        <AdminDecisionPanel
          driverId={driverId}
          eligibilityStatus={submission.eligibilityStatus}
          reviewDueAt={submission.reviewDueAt}
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
