"use client";

import { useEffect, useMemo, useState } from "react";
import {
  getComplianceDocumentAlerts,
  updateComplianceDocumentTracking,
  type ComplianceDocumentTracking,
  type ComplianceReviewData,
} from "@/lib/driverCompliance";
import { ComplianceDocumentStatusSummary } from "./ComplianceDocumentStatusSummary";

type BooleanTrackingField =
  | "w9SavedToGusto"
  | "contractSavedToGusto"
  | "insuranceSavedToGusto"
  | "driversLicenseSavedToGusto";

type DateTrackingField = "insuranceExpiresOn" | "driversLicenseExpiresOn";

function formatUpdatedAt(value: string | null) {
  if (!value) {
    return "No admin Gusto confirmation saved yet.";
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return `Last updated ${value}`;
  }

  return `Last updated ${parsed.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

export function ComplianceDocumentTrackingPanel({
  driverId,
  tracking,
  onSaved,
}: {
  driverId: string;
  tracking: ComplianceDocumentTracking;
  onSaved?: (data: ComplianceReviewData) => void;
}) {
  const [formState, setFormState] = useState<ComplianceDocumentTracking>(tracking);
  const [message, setMessage] = useState<string | null>(null);
  const [messageTone, setMessageTone] = useState<"success" | "error">("success");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setFormState(tracking);
  }, [driverId, tracking]);

  const alertPreview = useMemo(() => {
    return getComplianceDocumentAlerts(formState);
  }, [formState]);

  function toggleField(field: BooleanTrackingField) {
    setFormState((current) => ({
      ...current,
      [field]: !current[field],
    }));
  }

  function updateDateField(field: DateTrackingField, value: string) {
    setFormState((current) => ({
      ...current,
      [field]: value || null,
    }));
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);

    try {
      const updatedReviewData = await updateComplianceDocumentTracking({
        driverId,
        tracking: formState,
      });

      onSaved?.(updatedReviewData);
      setMessageTone("success");
      setMessage("Gusto document tracking saved.");
    } catch (error) {
      setMessageTone("error");
      setMessage(
        error instanceof Error ? error.message : "Unable to save the Gusto document tracking."
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
          Gusto document tracking
        </h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          Admin-only confirmation that the signed onboarding documents are saved in Gusto and the
          date-based items remain current.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <input
            type="checkbox"
            checked={formState.w9SavedToGusto}
            onChange={() => toggleField("w9SavedToGusto")}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            <span className="block font-medium text-zinc-900 dark:text-zinc-100">
              Signed W-9 saved to Gusto
            </span>
            <span className="text-zinc-600 dark:text-zinc-300">
              Use this once the signed W-9 is filed in Gusto.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <input
            type="checkbox"
            checked={formState.contractSavedToGusto}
            onChange={() => toggleField("contractSavedToGusto")}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            <span className="block font-medium text-zinc-900 dark:text-zinc-100">
              Signed contractor agreement saved to Gusto
            </span>
            <span className="text-zinc-600 dark:text-zinc-300">
              Confirm the executed Independent Contractor Agreement is on file.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <input
            type="checkbox"
            checked={formState.insuranceSavedToGusto}
            onChange={() => toggleField("insuranceSavedToGusto")}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            <span className="block font-medium text-zinc-900 dark:text-zinc-100">
              Active insurance saved to Gusto
            </span>
            <span className="text-zinc-600 dark:text-zinc-300">
              Confirm the current proof of insurance is stored in Gusto.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3 text-sm dark:border-zinc-800 dark:bg-zinc-950">
          <input
            type="checkbox"
            checked={formState.driversLicenseSavedToGusto}
            onChange={() => toggleField("driversLicenseSavedToGusto")}
            className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-blue-600 focus:ring-blue-500"
          />
          <span>
            <span className="block font-medium text-zinc-900 dark:text-zinc-100">
              Active driver’s license saved to Gusto
            </span>
            <span className="text-zinc-600 dark:text-zinc-300">
              Confirm the current driver’s license copy is stored in Gusto.
            </span>
          </span>
        </label>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-900 dark:text-zinc-100">
            Insurance expiration date
          </span>
          <input
            type="date"
            value={formState.insuranceExpiresOn ?? ""}
            onChange={(event) => updateDateField("insuranceExpiresOn", event.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1 block font-medium text-zinc-900 dark:text-zinc-100">
            Driver’s license expiration date
          </span>
          <input
            type="date"
            value={formState.driversLicenseExpiresOn ?? ""}
            onChange={(event) => updateDateField("driversLicenseExpiresOn", event.target.value)}
            className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
          />
        </label>
      </div>

      <div className="mt-4 rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
          Board preview
        </div>
        <ComplianceDocumentStatusSummary tracking={formState} alerts={alertPreview} />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-xs text-zinc-600 dark:text-zinc-300">
          {formatUpdatedAt(formState.updatedAt)}
        </div>
        <button
          type="button"
          disabled={isSaving}
          onClick={() => void handleSave()}
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {isSaving ? "Saving..." : "Save Gusto tracking"}
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
