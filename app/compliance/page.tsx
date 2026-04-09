"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ComplianceStatusBadge } from "@/components/driverCompliance/ComplianceStatusBadge";

function formatSummaryDate(value: string | null) {
  if (!value) return "Not set";

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
import {
  getComplianceDashboardData,
  type ComplianceDashboardData,
} from "@/lib/driverCompliance";

type DashboardFilter = "all" | "needs-review" | "flags" | "follow-up";

export default function ComplianceDashboardPage() {
  const [dashboard, setDashboard] = useState<ComplianceDashboardData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("all");

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const result = await getComplianceDashboardData();
        if (isActive) {
          setDashboard(result);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load the compliance dashboard."
          );
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, []);

  if (!dashboard && !errorMessage) {
    return (
      <main className="mx-auto max-w-7xl p-4 text-sm text-zinc-600 dark:text-zinc-300 sm:p-6 lg:p-8">
        Loading compliance dashboard...
      </main>
    );
  }

  const isAdmin = dashboard?.isAdmin ?? false;
  const returnHref = isAdmin ? "/weekly" : "/availability";
  const returnLabel = isAdmin
    ? "Back to dispatcher page"
    : "Back to driver availability page";

  const followUpCount = (dashboard?.rows ?? []).filter((row) =>
    ["review_required", "blocked", "expired", "conditionally_approved"].includes(row.status)
  ).length;

  const filteredRows = (() => {
    const rows = dashboard?.rows ?? [];

    switch (activeFilter) {
      case "needs-review":
        return rows.filter((row) => ["submitted", "review_required"].includes(row.status));
      case "flags":
        return rows.filter((row) => row.flagCount > 0);
      case "follow-up":
        return rows.filter((row) =>
          ["review_required", "blocked", "expired", "conditionally_approved"].includes(
            row.status
          )
        );
      case "all":
      default:
        return rows;
    }
  })();

  const driverRow = !isAdmin ? (dashboard?.rows ?? [])[0] ?? null : null;
  const driverProgressWidth = Math.max(6, Math.min(driverRow?.progress ?? 0, 100));

  return (
    <main className="mx-auto max-w-7xl p-4 text-zinc-900 dark:text-zinc-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            {isAdmin ? "Driver Compliance Dashboard" : "My Compliance Packet"}
          </h1>
          <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
            {isAdmin
              ? "Live compliance data for admin review using the authenticated session."
              : "This view is limited to your own compliance submission and draft progress."}
          </p>
        </div>

        <Link
          href={returnHref}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          {returnLabel}
        </Link>
      </div>

      {errorMessage && (
        <div className="mb-6 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {dashboard && (
        <>
          {!isAdmin && driverRow && (
            <section className="mx-auto max-w-3xl rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2">
                    <ComplianceStatusBadge status={driverRow.status} />
                  </div>
                  <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
                    {driverRow.driverName}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    Here is your current compliance summary. Open the detailed wizard to review, update, or submit your packet.
                  </p>
                </div>

                <Link
                  href={`/compliance/${driverRow.driverId}`}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Open compliance wizard
                </Link>
              </div>

              <div className="mt-6">
                <div className="mb-2 flex items-center justify-between text-sm text-zinc-600 dark:text-zinc-300">
                  <span>Packet progress</span>
                  <span className="font-medium text-zinc-900 dark:text-zinc-100">{driverRow.progress}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-blue-600 transition-all"
                    style={{ width: `${driverProgressWidth}%` }}
                  />
                </div>
              </div>

              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Eligibility</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {driverRow.eligibilityStatus}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Flags</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {driverRow.flagCount}
                    {driverRow.highRiskFlagCount > 0 ? ` (${driverRow.highRiskFlagCount} high)` : ""}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Last updated</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {formatSummaryDate(driverRow.lastUpdatedAt)}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-950">
                  <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Next review</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {formatSummaryDate(driverRow.expiresAt)}
                  </div>
                </div>
              </div>

              <div className="mt-4 rounded-lg border border-blue-300 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
                This page is intentionally simplified for drivers. The detailed questionnaire and submission tools live inside the wizard.
              </div>
            </section>
          )}

          {!isAdmin && !driverRow && (
            <div className="mb-6 rounded border border-blue-300 bg-blue-50 p-3 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950 dark:text-blue-200">
              Your compliance record is not available yet.
            </div>
          )}

          {isAdmin && (
            <>
              <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { key: "all" as const, label: "All packets", value: dashboard.totalDrivers },
                  {
                    key: "needs-review" as const,
                    label: "Needs review",
                    value: dashboard.pendingReviewCount,
                  },
                  { key: "flags" as const, label: "Packets with flags", value: dashboard.flaggedCount },
                  { key: "follow-up" as const, label: "Follow-up items", value: followUpCount },
                ].map((card) => {
                  const isActive = activeFilter === card.key;

                  return (
                    <button
                      key={card.key}
                      type="button"
                      onClick={() => setActiveFilter(card.key)}
                      className={`rounded-xl border p-4 text-left shadow-sm transition dark:border-zinc-800 ${
                        isActive
                          ? "border-blue-500 bg-blue-50 dark:bg-blue-950/40"
                          : "border-zinc-200 bg-white dark:bg-zinc-900"
                      }`}
                    >
                      <div className="text-sm text-zinc-600 dark:text-zinc-300">{card.label}</div>
                      <div className="mt-1 text-2xl font-semibold">{card.value}</div>
                    </button>
                  );
                })}
              </div>

              <div className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
                Showing <span className="font-medium">{filteredRows.length}</span> row(s) for the
                selected quick filter.
              </div>

              <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
                    <thead className="bg-zinc-50 dark:bg-zinc-950">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Driver
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Status
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Eligibility
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Progress
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Flags
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                      {filteredRows.map((row) => (
                        <tr key={row.driverId}>
                          <td className="px-4 py-3 text-sm">
                            <div className="font-medium text-zinc-900 dark:text-zinc-100">
                              {row.driverName}
                            </div>
                            <div className="text-zinc-500 dark:text-zinc-400">{row.driverId}</div>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <ComplianceStatusBadge status={row.status} />
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                            {row.eligibilityStatus}
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                            {row.progress}%
                          </td>
                          <td className="px-4 py-3 text-sm text-zinc-700 dark:text-zinc-200">
                            {row.flagCount}
                            {row.highRiskFlagCount > 0 ? ` (${row.highRiskFlagCount} high)` : ""}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/compliance/${row.driverId}/review`}
                                className="rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700"
                              >
                                Review packet
                              </Link>
                              <Link
                                href={`/compliance/${row.driverId}`}
                                className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                              >
                                Open wizard
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-6 text-sm text-zinc-600 dark:text-zinc-300"
                          >
                            No compliance rows are available yet for this account.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </>
      )}
    </main>
  );
}
