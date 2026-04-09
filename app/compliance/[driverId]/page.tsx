"use client";

import { use, useEffect, useState } from "react";
import { ComplianceWizardLayout } from "@/components/driverCompliance/ComplianceWizardLayout";
import {
  driverComplianceSurveySchema,
  getComplianceSubmissionByDriverId,
  getComplianceViewerAccess,
  type ComplianceSubmission,
  type ComplianceViewerAccess,
} from "@/lib/driverCompliance";

export default function DriverCompliancePage({
  params,
}: {
  params: Promise<{ driverId: string }>;
}) {
  const { driverId } = use(params);
  const [submission, setSubmission] = useState<ComplianceSubmission | null>(null);
  const [viewer, setViewer] = useState<ComplianceViewerAccess | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isActive = true;

    void (async () => {
      try {
        const [submissionResult, viewerResult] = await Promise.all([
          getComplianceSubmissionByDriverId(driverId),
          getComplianceViewerAccess(driverId),
        ]);

        if (isActive) {
          setSubmission(submissionResult);
          setViewer(viewerResult);
          setErrorMessage(null);
        }
      } catch (error) {
        if (isActive) {
          setErrorMessage(
            error instanceof Error ? error.message : "Unable to load the compliance packet."
          );
        }
      }
    })();

    return () => {
      isActive = false;
    };
  }, [driverId]);

  if ((!submission || !viewer) && !errorMessage) {
    return (
      <main className="mx-auto max-w-7xl p-4 text-sm text-zinc-600 dark:text-zinc-300 sm:p-6 lg:p-8">
        Loading compliance packet...
      </main>
    );
  }

  if (!submission || !viewer) {
    return (
      <main className="mx-auto max-w-3xl p-4 text-zinc-900 dark:text-zinc-100 sm:p-6 lg:p-8">
        <div className="rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {errorMessage ?? "Unable to load the compliance packet."}
        </div>
      </main>
    );
  }

  return (
    <ComplianceWizardLayout
      driverId={driverId}
      submission={submission}
      sections={driverComplianceSurveySchema}
      viewer={viewer}
      onSubmissionSaved={setSubmission}
    />
  );
}
