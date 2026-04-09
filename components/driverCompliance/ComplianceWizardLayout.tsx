"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildSectionProgress,
  getOverallComplianceProgress,
  normalizeAnswers,
  saveComplianceDraft,
  startNewComplianceVersion,
  submitComplianceForReview,
  type ComplianceAnswerValue,
  type ComplianceAnswers,
  type ComplianceSectionDefinition,
  type ComplianceSubmission,
  type ComplianceViewerAccess,
} from "@/lib/driverCompliance";
import { AttestationBlock } from "./AttestationBlock";
import { ComplianceProgressBar } from "./ComplianceProgressBar";
import { ComplianceQuestionRenderer } from "./ComplianceQuestionRenderer";
import { ComplianceRecordNav } from "./ComplianceRecordNav";

export function ComplianceWizardLayout({
  driverId,
  submission,
  sections,
  viewer,
  onSubmissionSaved,
}: {
  driverId: string;
  submission: ComplianceSubmission;
  sections: ComplianceSectionDefinition[];
  viewer: ComplianceViewerAccess;
  onSubmissionSaved?: (submission: ComplianceSubmission) => void;
}) {
  const initialIndex = Math.max(
    sections.findIndex((section) => {
      const progress = submission.sections.find((item) => item.key === section.key);
      return !progress?.completed;
    }),
    0
  );

  const [activeIndex, setActiveIndex] = useState(initialIndex);
  const [draftAnswers, setDraftAnswers] = useState<ComplianceAnswers>(() =>
    normalizeAnswers(submission.answers)
  );
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [saveTone, setSaveTone] = useState<"success" | "error">("success");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmittingForReview, setIsSubmittingForReview] = useState(false);

  useEffect(() => {
    setDraftAnswers(normalizeAnswers(submission.answers));
  }, [submission.answers, submission.id, submission.lastUpdatedAt]);

  const activeSection = useMemo(() => {
    return sections[activeIndex] ?? sections[0];
  }, [activeIndex, sections]);

  const draftSections = useMemo(() => {
    return buildSectionProgress(sections, draftAnswers, submission.lastUpdatedAt);
  }, [draftAnswers, sections, submission.lastUpdatedAt]);

  const draftProgress = useMemo(() => {
    return getOverallComplianceProgress(draftSections);
  }, [draftSections]);

  const currentSectionProgress = draftSections.find((section) => section.key === activeSection.key);

  const isDirty = useMemo(() => {
    return JSON.stringify(normalizeAnswers(submission.answers)) !== JSON.stringify(draftAnswers);
  }, [draftAnswers, submission.answers]);

  const attestationAnswers = draftAnswers.attestation ?? {};
  const attestationAccepted = Boolean(
    attestationAnswers.answers_truthful_and_complete === true &&
      attestationAnswers.responsible_for_own_taxes === true &&
      attestationAnswers.responsible_for_own_business_expenses_attestation === true &&
      attestationAnswers.may_accept_or_decline_work === true &&
      attestationAnswers.attestation_does_not_guarantee_work === true &&
      typeof attestationAnswers.electronic_signature === "string" &&
      attestationAnswers.electronic_signature.trim().length > 0
  );

  const isOwnDriver = viewer.role === "driver" && viewer.driverId === driverId;
  const canEditDraft = isOwnDriver && submission.isDraft;
  const canStartNewVersion = isOwnDriver && !submission.isDraft;

  const canSubmitForReview =
    canEditDraft && draftProgress === 100 && !submission.submittedAt && !isDirty && !isSaving;

  const saveStatusText = canStartNewVersion
    ? "This submitted packet is locked. Start a new version to make updates."
    : isSubmittingForReview
    ? "Submitting your packet for admin review..."
    : isSaving
    ? "Saving your latest changes..."
    : saveStatus === "error"
    ? "Autosave needs attention."
    : isDirty
    ? "Changes will autosave in a moment."
    : lastSavedAt
    ? `All changes saved at ${lastSavedAt}.`
    : "Changes save automatically as you work.";

  const focusNextStep = useCallback(
    (sectionKey: string, questionKey: string) => {
      const sectionIndex = sections.findIndex((section) => section.key === sectionKey);
      if (sectionIndex < 0) return;

      const section = sections[sectionIndex];
      const questionIndex = section.questions.findIndex((question) => question.key === questionKey);
      const nextQuestion = section.questions[questionIndex + 1];

      window.setTimeout(() => {
        if (nextQuestion) {
          document
            .getElementById(`compliance-question-${sectionKey}-${nextQuestion.key}`)
            ?.scrollIntoView({ behavior: "smooth", block: "center" });
          return;
        }

        if (sectionIndex < sections.length - 1) {
          setActiveIndex(sectionIndex + 1);
          window.scrollTo({ top: 0, behavior: "smooth" });
        }
      }, 120);
    },
    [sections]
  );

  function handleAnswerChange(
    sectionKey: string,
    questionKey: string,
    value: ComplianceAnswerValue
  ) {
    setDraftAnswers((current) => {
      const next: ComplianceAnswers = {
        ...current,
        [sectionKey]: {
          ...(current[sectionKey] ?? {}),
          [questionKey]: value,
        },
      };

      return normalizeAnswers(next);
    });
    setSaveMessage(null);
    setSaveStatus("idle");

    const question = sections
      .find((section) => section.key === sectionKey)
      ?.questions.find((item) => item.key === questionKey);

    if (question?.type === "yes_no") {
      focusNextStep(sectionKey, questionKey);
    }
  }

  const handleSaveDraft = useCallback(
    async (mode: "manual" | "auto" = "manual") => {
      if (!canEditDraft) return;

      setIsSaving(true);
      setSaveStatus("saving");
      if (mode === "manual") {
        setSaveMessage(null);
        setSaveTone("success");
      }

      try {
        const savedSubmission = await saveComplianceDraft({ driverId, answers: draftAnswers });
        onSubmissionSaved?.(savedSubmission);
        setSaveStatus("saved");
        setLastSavedAt(
          new Date().toLocaleTimeString([], {
            hour: "numeric",
            minute: "2-digit",
          })
        );
        setSaveMessage(null);
      } catch (error) {
        setSaveStatus("error");
        setSaveTone("error");
        setSaveMessage(
          error instanceof Error ? error.message : "Unable to save this draft right now."
        );
      } finally {
        setIsSaving(false);
      }
    },
    [canEditDraft, driverId, draftAnswers, onSubmissionSaved]
  );

  useEffect(() => {
    if (!canEditDraft || !isDirty || isSaving || isSubmittingForReview) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void handleSaveDraft("auto");
    }, 900);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [canEditDraft, isDirty, isSaving, isSubmittingForReview, handleSaveDraft]);

  async function handleSubmitForReview() {
    setIsSubmittingForReview(true);
    setSaveMessage(null);
    setSaveTone("success");

    try {
      const updatedSubmission = await submitComplianceForReview(driverId);
      onSubmissionSaved?.(updatedSubmission);
      setSaveStatus("saved");
      setLastSavedAt(
        new Date().toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        })
      );
      setSaveMessage("Packet submitted for admin review. This snapshot is now locked.");
    } catch (error) {
      setSaveTone("error");
      setSaveMessage(
        error instanceof Error ? error.message : "Unable to submit this packet for review."
      );
    } finally {
      setIsSubmittingForReview(false);
    }
  }

  async function handleStartNewVersion() {
    setIsSubmittingForReview(true);
    setSaveMessage(null);
    setSaveTone("success");

    try {
      const updatedSubmission = await startNewComplianceVersion(driverId);
      onSubmissionSaved?.(updatedSubmission);
      setSaveStatus("saved");
      setSaveMessage("A new editable compliance version has been opened.");
    } catch (error) {
      setSaveTone("error");
      setSaveMessage(
        error instanceof Error ? error.message : "Unable to start a new compliance version."
      );
    } finally {
      setIsSubmittingForReview(false);
    }
  }

  return (
    <main className="mx-auto max-w-7xl p-4 text-zinc-900 dark:text-zinc-100 sm:p-6 lg:p-8">
      <div className="mb-6">
        <Link
          href="/compliance"
          className="text-sm text-blue-600 hover:underline dark:text-blue-400"
        >
          {viewer.isAdmin ? "← Back to compliance dashboard" : "← Back to my compliance overview"}
        </Link>

        <h1 className="mt-2 text-2xl font-semibold">Driver Compliance Wizard</h1>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">
          {submission.driverName} • Packet version {submission.version} • Last updated {submission.lastUpdatedAt}
        </p>

        {viewer.isAdmin && (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
            <ComplianceRecordNav driverId={driverId} activeView="packet" />
          </div>
        )}
      </div>

      <div className="mb-6 flex flex-wrap items-center gap-2 text-xs sm:text-sm">
        <span
          className={`rounded-full px-3 py-1 font-medium ${
            canEditDraft
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200"
              : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300"
          }`}
        >
          {canEditDraft ? "Editable draft" : submission.submittedAt ? "Locked submitted snapshot" : "Read only"}
        </span>
        <span className="rounded-full bg-blue-50 px-3 py-1 font-medium text-blue-700 dark:bg-blue-950 dark:text-blue-200">
          Section {activeIndex + 1} of {sections.length}
        </span>
        <span className="rounded-full bg-zinc-100 px-3 py-1 font-medium text-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
          {currentSectionProgress?.answeredQuestions ?? 0}/{currentSectionProgress?.totalQuestions ?? 0} answered
        </span>
        {submission.submittedAt && (
          <span className="rounded-full bg-indigo-100 px-3 py-1 font-medium text-indigo-800 dark:bg-indigo-950 dark:text-indigo-200">
            Submitted for review
          </span>
        )}
      </div>

      {submission.notes &&
        (submission.status === "review_required" ||
          submission.status === "blocked" ||
          (canEditDraft && submission.status === "in_progress")) && (
          <div className="mb-6 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
            <div className="font-semibold">Admin follow-up note</div>
            <p className="mt-1">{submission.notes}</p>
            <p className="mt-2 text-xs opacity-90">
              Update your responses, save the draft, and submit again when you are ready.
            </p>
          </div>
        )}

      {saveMessage && (
        <div
          className={`mb-6 rounded border p-3 text-sm ${
            saveTone === "error"
              ? "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
              : "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200"
          }`}
        >
          {saveMessage}
        </div>
      )}

      <div className="space-y-6">
        <ComplianceProgressBar
          progress={draftProgress}
          sections={draftSections}
          activeSectionKey={activeSection.key}
        />

        <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-4 lg:self-start">
            <h2 className="mb-3 text-sm font-semibold text-zinc-900 dark:text-zinc-100">
              Jump to a section
            </h2>
            <div className="space-y-2">
              {sections.map((section, index) => {
                const progress = draftSections.find((item) => item.key === section.key);
                const isActive = activeSection.key === section.key;

                return (
                  <button
                    key={section.key}
                    type="button"
                    onClick={() => setActiveIndex(index)}
                    className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                      isActive
                        ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-700 dark:bg-blue-950/40 dark:text-blue-200"
                        : "border-zinc-200 bg-zinc-50 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200 dark:hover:bg-zinc-900"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`inline-flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                          progress?.completed
                            ? "bg-emerald-600 text-white"
                            : isActive
                            ? "bg-blue-600 text-white"
                            : "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
                        }`}
                      >
                        {progress?.completed ? "✓" : index + 1}
                      </span>
                      <div>
                        <div className="font-medium">{section.title}</div>
                        <div className="mt-0.5 text-xs opacity-80">
                          {progress?.completionPercent ?? 0}% complete
                        </div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </aside>

          <div className="space-y-4">
            <ComplianceQuestionRenderer
              section={activeSection}
              answers={draftAnswers}
              readOnly={!canEditDraft}
              onAnswerChange={canEditDraft ? handleAnswerChange : undefined}
            />
            {activeSection.key === "attestation" && (
              <AttestationBlock driverName={submission.driverName} accepted={attestationAccepted} />
            )}

            <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                    Smooth navigation
                  </div>
                  <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                    Use the section list on the left or the next/previous buttons below.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveIndex((current) => Math.max(current - 1, 0))}
                    disabled={activeIndex === 0}
                    className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  >
                    Previous
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveIndex((current) => Math.min(current + 1, sections.length - 1))
                    }
                    disabled={activeIndex === sections.length - 1}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    Next
                  </button>
                  {canStartNewVersion && (
                    <button
                      type="button"
                      onClick={() => void handleStartNewVersion()}
                      disabled={isSubmittingForReview}
                      className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmittingForReview ? "Opening..." : "Start new version"}
                    </button>
                  )}
                  {canEditDraft && (
                    <button
                      type="button"
                      onClick={() => void handleSubmitForReview()}
                      disabled={!canSubmitForReview || isSubmittingForReview}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSubmittingForReview ? "Submitting..." : "Submit for review"}
                    </button>
                  )}
                  {viewer.canReview && (
                    <Link
                      href={`/compliance/${driverId}/review`}
                      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                    >
                      Review packet
                    </Link>
                  )}
                </div>
              </div>

              <div className="mt-3 text-xs text-zinc-600 dark:text-zinc-300">
                <Link
                  href={`/compliance/${driverId}/complete`}
                  className="text-green-700 hover:underline dark:text-green-300"
                >
                  View completion summary
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(canEditDraft || canStartNewVersion || viewer.isAdmin) && (
        <div className="sticky bottom-3 z-20 mt-6">
          <div className="rounded-2xl border border-zinc-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-zinc-800 dark:bg-zinc-900/95">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                  {viewer.isAdmin
                    ? "Admin quick navigation"
                    : canEditDraft
                    ? "Autosave enabled"
                    : "Submitted snapshot"}
                </div>
                <p className="mt-1 text-xs text-zinc-600 dark:text-zinc-300">
                  {viewer.isAdmin
                    ? "Jump back to the dashboard or switch record views without losing your place."
                    : saveStatusText}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {viewer.isAdmin && (
                  <ComplianceRecordNav driverId={driverId} activeView="packet" />
                )}
                {canEditDraft && (
                  <button
                    type="button"
                    onClick={() => void handleSaveDraft("manual")}
                    disabled={isSaving || !isDirty || isSubmittingForReview}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSaving ? "Saving..." : isDirty ? "Save now" : "Saved"}
                  </button>
                )}
                {canStartNewVersion && (
                  <button
                    type="button"
                    onClick={() => void handleStartNewVersion()}
                    disabled={isSubmittingForReview}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmittingForReview ? "Opening..." : "Start new version"}
                  </button>
                )}
                {canEditDraft && (
                  <button
                    type="button"
                    onClick={() => void handleSubmitForReview()}
                    disabled={!canSubmitForReview || isSubmittingForReview}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isSubmittingForReview ? "Submitting..." : "Submit for review"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
