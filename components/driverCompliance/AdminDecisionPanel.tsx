"use client";

import { useEffect, useState } from "react";
import {
  submitComplianceReviewDecision,
  type ComplianceReviewData,
  type ComplianceReviewerAidSummary,
  type ComplianceSuggestedDecision,
  type EligibilityStatus,
} from "@/lib/driverCompliance";

const eligibilityLabelMap: Record<EligibilityStatus, string> = {
  eligible: "Eligible",
  review_required: "Review required",
  ineligible: "Ineligible",
};

const suggestionClassMap: Record<ComplianceSuggestedDecision, string> = {
  approve:
    "border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100",
  request_changes:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  request_changes_or_reject:
    "border-red-300 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
};

function formatDueDate(value: string | null) {
  if (!value) return null;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return parsed.toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function isSuggestedAction(
  action: "approve" | "request_changes" | "reject",
  suggestedDecision: ComplianceSuggestedDecision
) {
  if (suggestedDecision === "approve") {
    return action === "approve";
  }

  if (suggestedDecision === "request_changes") {
    return action === "request_changes";
  }

  return action === "request_changes" || action === "reject";
}

export function AdminDecisionPanel({
  driverId,
  eligibilityStatus,
  reviewDueAt,
  reviewAid,
  onDecisionRecorded,
}: {
  driverId: string;
  eligibilityStatus: EligibilityStatus;
  reviewDueAt: string | null;
  reviewAid: ComplianceReviewerAidSummary;
  onDecisionRecorded?: (data: ComplianceReviewData) => void;
}) {
  const formattedDueDate = formatDueDate(reviewDueAt);
  const dueLabel = eligibilityStatus === "eligible" ? "Annual review due" : "Review due";
  const [reviewNote, setReviewNote] = useState(reviewAid.compiledReviewerNote);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setReviewNote(reviewAid.compiledReviewerNote);
  }, [driverId, reviewAid.compiledReviewerNote]);

  async function handleAction(action: "approve" | "request_changes" | "reject") {
    if ((action === "request_changes" || action === "reject") && !reviewNote.trim()) {
      setMessageTone("error");
      setMessage("Add a reviewer note before requesting changes or rejecting this packet.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      const updatedReviewData = await submitComplianceReviewDecision({
        driverId,
        action,
        note: reviewNote,
      });

      onDecisionRecorded?.(updatedReviewData);
      setMessageTone("success");
      setMessage(
        action === "approve"
          ? "Approval saved and audit trail updated."
          : action === "request_changes"
          ? "Change request saved and sent to the audit trail."
          : "Rejection saved and recorded in the audit trail."
      );
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error instanceof Error ? error.message : "Unable to save the compliance decision."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Admin decision panel
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Current recommendation: <span className="font-medium">{eligibilityLabelMap[eligibilityStatus]}</span>
          {formattedDueDate ? ` • ${dueLabel} ${formattedDueDate}` : ""}
        </p>
      </div>

      <div className={`mb-4 rounded-lg border p-3 ${suggestionClassMap[reviewAid.suggestedDecision]}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
              Suggested next step
            </div>
            <div className="mt-1 text-sm font-semibold">{reviewAid.suggestedDecisionLabel}</div>
            <p className="mt-1 text-sm">{reviewAid.recommendationSummary}</p>
          </div>
          <div className="flex flex-wrap gap-2 text-[11px] font-semibold uppercase tracking-wide">
            <span className="rounded-full border border-current px-2 py-1">
              {reviewAid.mismatchCount} mismatch{reviewAid.mismatchCount === 1 ? "" : "es"}
            </span>
            {reviewAid.blockingMismatchCount > 0 && (
              <span className="rounded-full border border-current px-2 py-1">
                {reviewAid.blockingMismatchCount} blocking
              </span>
            )}
            {reviewAid.highMismatchCount > 0 && (
              <span className="rounded-full border border-current px-2 py-1">
                {reviewAid.highMismatchCount} high
              </span>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs opacity-90">
          Automated notes are internal reviewer aids only and should be weighed with the total
          relationship, not treated as standalone legal conclusions.
        </p>
      </div>

      <div className="mb-2 flex items-center justify-between gap-3">
        <label className="block text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Reviewer note
        </label>
        {reviewAid.compiledReviewerNote && (
          <button
            type="button"
            onClick={() => setReviewNote(reviewAid.compiledReviewerNote)}
            className="text-xs font-medium text-blue-600 hover:underline dark:text-blue-400"
          >
            Use suggested notes
          </button>
        )}
      </div>
      <textarea
        value={reviewNote}
        onChange={(event) => setReviewNote(event.target.value)}
        placeholder="Add approval notes or explain what changes are required."
        className="min-h-40 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
        Suggested canned notes are prefilled when mismatches are detected. Notes remain editable,
        optional for approval, and required for change requests or rejection.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleAction("approve")}
          className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Approve"}
          {isSuggestedAction("approve", reviewAid.suggestedDecision) ? " • Recommended" : ""}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleAction("request_changes")}
          className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Request changes
          {isSuggestedAction("request_changes", reviewAid.suggestedDecision)
            ? " • Recommended"
            : ""}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleAction("reject")}
          className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Reject
          {isSuggestedAction("reject", reviewAid.suggestedDecision) ? " • Recommended" : ""}
        </button>
      </div>

      {message && (
        <div
          className={`mt-4 rounded border p-3 text-sm ${
            messageTone === "success"
              ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
              : "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          {message}
        </div>
      )}
    </section>
  );
}
