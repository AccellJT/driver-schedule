import Link from "next/link";

type ComplianceRecordView = "packet" | "review" | "summary";

export function ComplianceRecordNav({
  driverId,
  activeView,
  className = "",
}: {
  driverId: string;
  activeView: ComplianceRecordView;
  className?: string;
}) {
  const links = [
    { key: "dashboard", label: "← Dashboard", href: "/compliance" },
    { key: "packet", label: "Packet", href: `/compliance/${driverId}` },
    { key: "review", label: "Review", href: `/compliance/${driverId}/review` },
    { key: "summary", label: "Summary", href: `/compliance/${driverId}/complete` },
  ] as const;

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {links.map((link) => {
        const isActive = link.key === activeView;
        const isDashboard = link.key === "dashboard";

        return (
          <Link
            key={link.key}
            href={link.href}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition ${
              isDashboard || isActive
                ? "bg-blue-600 text-white hover:bg-blue-700"
                : "border border-zinc-300 text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </div>
  );
}
