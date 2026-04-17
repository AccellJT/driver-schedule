"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ComplianceDocumentStatusSummary } from "@/components/driverCompliance/ComplianceDocumentStatusSummary";
import { ComplianceStatusBadge } from "@/components/driverCompliance/ComplianceStatusBadge";
import {
  getComplianceDashboardData,
  type ComplianceDashboardData,
  type ComplianceStatus,
} from "@/lib/driverCompliance";

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

function getReviewTargetBadge(
  status: ComplianceStatus | null | undefined,
  submittedAt: string | null | undefined,
  reviewedAt: string | null | undefined
) {
  if (status === "submitted") {
    return {
      label: "Admin review pending",
      className:
        "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
    };
  }

  if (status === "review_required") {
    if (submittedAt && !reviewedAt) {
      return {
        label: "Admin review pending",
        className:
          "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-900 dark:bg-indigo-950 dark:text-indigo-200",
      };
    }

    return {
      label: "Driver action required",
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200",
    };
  }

  return null;
}

type DashboardFilter =
  | "all"
  | "driver-review"
  | "admin-review"
  | "in-progress"
  | "not-started"
  | "high-flags";

export default function ComplianceDashboardPage() {
  const [dashboard, setDashboard] = useState<ComplianceDashboardData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<DashboardFilter>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  const rows = dashboard?.rows ?? [];
  const driverReviewCount = rows.filter((row) => row.status === "review_required").length;
  const adminReviewCount = rows.filter((row) => row.status === "submitted").length;
  const inProgressCount = rows.filter((row) => row.status === "in_progress").length;
  const notStartedCount = rows.filter((row) => row.status === "not_started").length;
  const highFlagCount = rows.filter((row) => row.highRiskFlagCount > 0).length;
  const insurancePendingCount = rows.filter((row) => {
    const insuranceAlert = row.documentAlerts.find((alert) => alert.key === "insurance");
    return !row.documentTracking.insuranceSavedToGusto || insuranceAlert?.status !== "current";
  }).length;
  const dlPendingCount = rows.filter((row) => {
    const dlAlert = row.documentAlerts.find((alert) => alert.key === "drivers_license");
    return !row.documentTracking.driversLicenseSavedToGusto || dlAlert?.status !== "current";
  }).length;
  const w9PendingCount = rows.filter((row) => !row.documentTracking.w9SavedToGusto).length;
  const contractPendingCount = rows.filter((row) => !row.documentTracking.contractSavedToGusto).length;

  const filteredRows = (() => {
    const normalizedSearchQuery = searchQuery.trim().toLowerCase();

    const filteredByQuickFilter = (() => {
      switch (activeFilter) {
        case "driver-review":
          return rows.filter((row) => row.status === "review_required");
        case "admin-review":
          return rows.filter((row) => row.status === "submitted");
        case "in-progress":
          return rows.filter((row) => row.status === "in_progress");
        case "not-started":
          return rows.filter((row) => row.status === "not_started");
        case "high-flags":
          return rows.filter((row) => row.highRiskFlagCount > 0);
        case "all":
        default:
          return rows;
      }
    })();

    if (!normalizedSearchQuery) {
      return filteredByQuickFilter;
    }

    return filteredByQuickFilter.filter((row) => {
      return (
        row.driverName.toLowerCase().includes(normalizedSearchQuery) ||
        row.driverId.toLowerCase().includes(normalizedSearchQuery)
      );
    });
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

        <div className="flex flex-wrap gap-2">
          <Link
            href="/admin/audit"
            className="rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Availability audit
          </Link>
          <Link
            href={returnHref}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            {returnLabel}
          </Link>
        </div>
      </div>

      {isAdmin && (
        <>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex w-full max-w-md flex-col gap-2 text-sm text-zinc-700 dark:text-zinc-300">
              <span className="font-semibold">Search drivers</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search by name or driver ID"
                className="h-11 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
              />
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                  activeFilter === "all"
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                All ({rows.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("driver-review")}
                className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                  activeFilter === "driver-review"
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                Driver review ({driverReviewCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("admin-review")}
                className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                  activeFilter === "admin-review"
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                Admin review ({adminReviewCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("in-progress")}
                className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                  activeFilter === "in-progress"
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                In progress ({inProgressCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("not-started")}
                className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                  activeFilter === "not-started"
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                Not started ({notStartedCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter("high-flags")}
                className={`rounded-full border px-3 py-2 text-sm font-semibold ${
                  activeFilter === "high-flags"
                    ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                    : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                }`}
              >
                Packets with high flags ({highFlagCount})
              </button>
            </div>
          </div>

          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Insurance pending", value: insurancePendingCount },
              { label: "DL pending", value: dlPendingCount },
              { label: "W-9 pending", value: w9PendingCount },
              { label: "Contract pending", value: contractPendingCount },
            ].map((card) => (
              <div
                key={card.label}
                className="rounded-xl border border-zinc-200 bg-zinc-50 p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
              >
                <div className="text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
                  {card.label}
                </div>
                <div className="mt-1 text-2xl font-semibold text-zinc-900 dark:text-zinc-100">
                  {card.value}
                </div>
              </div>
            ))}
          </div>
        </>
      )}

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
                  <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">
                    {driverRow.driverName}
                  </h2>
                  <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
                    Here is your current compliance summary. Open the detailed questions to review, update, or submit your packet.
                  </p>
                </div>

                <Link
                  href={`/compliance/${driverRow.driverId}`}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Open compliance questions
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
                          Docs / Gusto
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
                            <div className="flex flex-col gap-2">
                              <ComplianceStatusBadge status={row.status} />
                              {(() => {
                                const reviewTarget = getReviewTargetBadge(
                                  row.status,
                                  row.submittedAt,
                                  row.reviewedAt
                                );
                                return reviewTarget ? (
                                  <span
                                    className={`inline-flex max-w-max rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${reviewTarget.className}`}
                                  >
                                    {reviewTarget.label}
                                  </span>
                                ) : null;
                              })()}
                            </div>
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
                            <ComplianceDocumentStatusSummary
                              tracking={row.documentTracking}
                              alerts={row.documentAlerts}
                            />
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
                                Open questions
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}

                      {filteredRows.length === 0 && (
                        <tr>
                          <td
                            colSpan={7}
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
