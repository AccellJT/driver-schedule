"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import { ComplianceRecordNav } from "@/components/driverCompliance/ComplianceRecordNav";
import { ComplianceStatusBadge } from "@/components/driverCompliance/ComplianceStatusBadge";
import {
  getComplianceCompletionData,
  type ComplianceCompletionData,
} from "@/lib/driverCompliance";

export default function DriverComplianceCompletePage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = use(params);
  const [completionData, setCompletionData] = useState<ComplianceCompletionData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const result = await getComplianceCompletionData(driverId);
        if (isActive) {
          setCompletionData(result);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load completion details."
          );
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [driverId]);

  if (!completionData && !errorMessage) {
    return (
      <main className="mx-auto max-w-3xl p-4 text-sm text-zinc-600 dark:text-zinc-300 sm:p-6 lg:p-8">
        Loading completion details...
      </main>
    );
  }

  if (!completionData) {
    return (
      <main className="mx-auto max-w-3xl p-4 text-zinc-900 dark:text-zinc-100 sm:p-6 lg:p-8">
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {errorMessage ?? "Unable to load completion details."}
        </div>
      </main>
    );
  }

  const { submission, expiration } = completionData;

  return (
    <main className="mx-auto max-w-3xl p-4 text-zinc-900 dark:text-zinc-100 sm:p-6 lg:p-8">
      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <ComplianceStatusBadge status={submission.status} />
            <span className="text-sm text-zinc-600 dark:text-zinc-300">
              Completion summary for {submission.driverName}
            </span>
          </div>

          <ComplianceRecordNav driverId={driverId} activeView="summary" />
        </div>

        <h1 className="text-2xl font-semibold">Compliance Completion</h1>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-300">
          This page now reflects the live compliance record stored in Supabase.
        </p>

        {errorMessage && (
          <div className="mt-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
            {errorMessage}
          </div>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm text-zinc-600 dark:text-zinc-300">Packet progress</div>
            <div className="mt-1 text-xl font-semibold">{submission.progress}%</div>
          </div>
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
            <div className="text-sm text-zinc-600 dark:text-zinc-300">Expiration</div>
            <div className="mt-1 text-xl font-semibold">{expiration.label}</div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-700 dark:border-green-900 dark:bg-green-950 dark:text-green-200">
          Submission status is currently <span className="font-semibold">{submission.status}</span>.
          Real write flows can now target the new compliance tables.
        </div>

        <div className="mt-6">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Section summary</h2>
          <div className="mt-3 space-y-2">
            {submission.sections.map((section) => (
              <div
                key={section.key}
                className="flex items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <span>{section.title}</span>
                <span className="text-zinc-600 dark:text-zinc-300">
                  {section.completionPercent}% complete
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href={`/compliance/${driverId}`}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Back to wizard
          </Link>
          <Link
            href="/compliance"
            className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
          >
            Compliance dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
