"use client";

import { useState } from "react";
import {
  submitComplianceReviewDecision,
  type ComplianceReviewData,
  type EligibilityStatus,
} from "@/lib/driverCompliance";

const eligibilityLabelMap: Record<EligibilityStatus, string> = {
  eligible: "Eligible",
  review_required: "Review required",
  ineligible: "Ineligible",
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

export function AdminDecisionPanel({
  driverId,
  eligibilityStatus,
  reviewDueAt,
  onDecisionRecorded,
}: {
  driverId: string;
  eligibilityStatus: EligibilityStatus;
  reviewDueAt: string | null;
  onDecisionRecorded?: (data: ComplianceReviewData) => void;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const formattedDueDate = formatDueDate(reviewDueAt);
  const dueLabel = eligibilityStatus === "eligible" ? "Annual review due" : "Review due";
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isSubmitting, setIsSubmitting] = useState(false);

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

      <label className="mb-2 block text-sm font-medium text-zinc-900 dark:text-zinc-100">
        Reviewer note
      </label>
      <textarea
        value={reviewNote}
        onChange={(event) => setReviewNote(event.target.value)}
        placeholder="Add approval notes or explain what changes are required."
        className="min-h-28 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
      />
      <p className="mt-2 text-xs text-zinc-600 dark:text-zinc-300">
        Notes are optional for approval and required for change requests or rejection.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleAction("approve")}
          className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Approve"}
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleAction("request_changes")}
          className="rounded bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
        >
          Request changes
        </button>
        <button
          type="button"
          disabled={isSubmitting}
          onClick={() => void handleAction("reject")}
          className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
        >
          Reject
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
