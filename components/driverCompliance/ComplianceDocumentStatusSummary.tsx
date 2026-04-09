import type {
  ComplianceDocumentAlert,
  ComplianceDocumentAlertStatus,
  ComplianceDocumentTracking,
} from "@/lib/driverCompliance";

const confirmationClassMap = {
  confirmed:
    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  pending:
    "border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-200",
} as const;

const alertClassMap: Record<ComplianceDocumentAlertStatus, string> = {
  current:
    "border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  due_soon:
    "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-100",
  expired:
    "border-red-300 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-100",
  missing:
    "border-yellow-300 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950 dark:text-yellow-100",
};

function buildAlertLabel(alert: ComplianceDocumentAlert) {
  if (alert.status === "expired") {
    return `${alert.label} expired`;
  }

  if (alert.status === "due_soon") {
    return alert.expiresOn ? `${alert.label} due ${alert.expiresOn}` : `${alert.label} due soon`;
  }

  if (alert.status === "missing") {
    return `${alert.label} needs update`;
  }

  return alert.expiresOn ? `${alert.label} current to ${alert.expiresOn}` : `${alert.label} current`;
}

export function ComplianceDocumentStatusSummary({
  tracking,
  alerts,
}: {
  tracking: ComplianceDocumentTracking;
  alerts: ComplianceDocumentAlert[];
}) {
  const attentionAlerts = alerts.filter((alert) => alert.status !== "current");
  const confirmations = [
    { label: "W-9", confirmed: tracking.w9SavedToGusto },
    { label: "Contract", confirmed: tracking.contractSavedToGusto },
    { label: "Insurance", confirmed: tracking.insuranceSavedToGusto },
    { label: "DL", confirmed: tracking.driversLicenseSavedToGusto },
  ];

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {confirmations.map((item) => (
          <span
            key={item.label}
            className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold uppercase tracking-wide ${
              item.confirmed ? confirmationClassMap.confirmed : confirmationClassMap.pending
            }`}
          >
            {item.label} {item.confirmed ? "saved" : "pending"}
          </span>
        ))}
      </div>

      {attentionAlerts.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {attentionAlerts.map((alert) => (
            <span
              key={`${alert.key}-${alert.status}`}
              className={`inline-flex rounded-full border px-2 py-1 text-[10px] font-semibold ${alertClassMap[alert.status]}`}
              title={alert.message}
            >
              {buildAlertLabel(alert)}
            </span>
          ))}
        </div>
      ) : (
        <div className="text-xs text-zinc-500 dark:text-zinc-400">No active expiry alerts.</div>
      )}
    </div>
  );
}
