"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabase";

type Profile = {
  id: string;
  name: string | null;
  role: string | null;
  driver_id: string | null;
  created_at: string | null;
  last_login_at: string | null;
};

type Driver = {
  id: string;
  full_name: string;
};

type AuditEntry = {
  id: string;
  created_at: string;
  actor_profile_id: string | null;
  actor_role: string | null;
  actor_name: string | null;
  target_driver_id: string | null;
  target_driver_name: string | null;
  action: string;
  details: string | null;
  source: string | null;
  event_metadata: Record<string, unknown> | null;
};

function formatDate(value: string | null) {
  if (!value) return "Not available";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getProfileDisplayName(profile: Profile) {
  return profile.name?.trim() || profile.role || profile.id;
}

export default function AdminAuditPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [auditRows, setAuditRows] = useState<AuditEntry[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "driver" | "dispatch" | "admin" | "ops" | "manager">("all");
  const [historyStartDate, setHistoryStartDate] = useState("");
  const [historyEndDate, setHistoryEndDate] = useState("");
  const [showAllHistory, setShowAllHistory] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    async function loadData() {
      setIsLoading(true);
      setErrorMessage(null);

      const [profilesResult, driversResult, auditResult] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, name, role, driver_id, created_at, last_login_at")
          .order("name", { ascending: true }),
        supabase.from("drivers").select("id, full_name").order("full_name", { ascending: true }),
        supabase
          .from("availability_activity_log")
          .select(
            "id, created_at, actor_profile_id, actor_role, actor_name, target_driver_id, target_driver_name, action, details, source, event_metadata"
          )
          .order("created_at", { ascending: false })
          .limit(500),
      ]);

      if (!active) return;

      if (profilesResult.error) {
        setErrorMessage(profilesResult.error.message);
      } else if (driversResult.error) {
        setErrorMessage(driversResult.error.message);
      } else if (auditResult.error) {
        setErrorMessage(auditResult.error.message);
      } else {
        setProfiles((profilesResult.data ?? []) as Profile[]);
        setDrivers((driversResult.data ?? []) as Driver[]);
        setAuditRows((auditResult.data ?? []) as AuditEntry[]);
        setLastLoadedAt(new Date().toLocaleString());
      }

      setIsLoading(false);
    }

    void loadData();
    return () => {
      active = false;
    };
  }, []);

  const filteredProfiles = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return profiles.filter((profile) => {
      if (roleFilter !== "all" && profile.role !== roleFilter) {
        return false;
      }

      if (!query) return true;

      return (
        profile.name?.toLowerCase().includes(query) ||
        profile.role?.toLowerCase().includes(query) ||
        profile.id.toLowerCase().includes(query)
      );
    });
  }, [profiles, roleFilter, searchQuery]);

  useEffect(() => {
    if (!selectedProfileId && filteredProfiles.length > 0) {
      setSelectedProfileId(filteredProfiles[0].id);
    }
  }, [filteredProfiles, selectedProfileId]);

  const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId) ?? null;
  const selectedDriverName = selectedProfile
    ? drivers.find((driver) => driver.id === selectedProfile.driver_id)?.full_name ?? "Unknown"
    : "Unknown";
  const totalActivityCount = auditRows.length;

  const selectedUserActivity = useMemo(() => {
    if (!selectedProfile) return [];

    return auditRows.filter((row) => {
      if (row.actor_profile_id === selectedProfile.id) return true;
      if (selectedProfile.driver_id && row.target_driver_id === selectedProfile.driver_id) return true;
      return false;
    });
  }, [auditRows, selectedProfile]);

  const filteredAuditRows = useMemo(() => {
    const dateMatches = (row: AuditEntry) => {
      if (!historyStartDate && !historyEndDate) return true;
      const rowDate = new Date(row.created_at);
      if (Number.isNaN(rowDate.getTime())) return false;
      const rowIso = rowDate.toISOString().slice(0, 10);
      if (historyStartDate && rowIso < historyStartDate) return false;
      if (historyEndDate && rowIso > historyEndDate) return false;
      return true;
    };

    if (filteredProfiles.length === profiles.length && !historyStartDate && !historyEndDate) {
      return auditRows;
    }

    const allowedProfileIds = new Set(filteredProfiles.map((profile) => profile.id));
    const allowedDriverIds = new Set(filteredProfiles.map((profile) => profile.driver_id).filter(Boolean));

    return auditRows.filter((row) => {
      if (!dateMatches(row)) return false;
      if (allowedProfileIds.has(row.actor_profile_id ?? "")) return true;
      if (row.target_driver_id && allowedDriverIds.has(row.target_driver_id)) return true;
      return false;
    });
  }, [auditRows, filteredProfiles, historyStartDate, historyEndDate, profiles.length]);

  const displayedAuditRows = useMemo(
    () => (showAllHistory ? filteredAuditRows : filteredAuditRows.slice(0, 8)),
    [filteredAuditRows, showAllHistory]
  );

  return (
    <main className="mx-auto max-w-7xl p-4 text-zinc-900 dark:text-zinc-100 sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold">Availability Activity Audit</h1>
          <p className="mt-1 max-w-2xl text-sm text-zinc-600 dark:text-zinc-300">
            Review recent availability changes, driver and dispatcher actions, and login timing for admin users.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <Link
            href="/compliance"
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Compliance dashboard
          </Link>
          <Link
            href="/weekly"
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Weekly board
          </Link>
          <button
            type="button"
            onClick={() => {
              setIsLoading(true);
              setErrorMessage(null);
              setLastLoadedAt(null);
              void (async () => {
                const [profilesResult, driversResult, auditResult] = await Promise.all([
                  supabase
                    .from("profiles")
                    .select("id, name, role, driver_id, created_at, last_login_at")
                    .order("name", { ascending: true }),
                  supabase.from("drivers").select("id, full_name").order("full_name", { ascending: true }),
                  supabase
                    .from("availability_activity_log")
                    .select(
                      "id, created_at, actor_profile_id, actor_role, actor_name, target_driver_id, target_driver_name, action, details, source, event_metadata"
                    )
                    .order("created_at", { ascending: false })
                    .limit(500),
                ]);

                if (profilesResult.error) {
                  setErrorMessage(profilesResult.error.message);
                } else if (driversResult.error) {
                  setErrorMessage(driversResult.error.message);
                } else if (auditResult.error) {
                  setErrorMessage(auditResult.error.message);
                } else {
                  setProfiles((profilesResult.data ?? []) as Profile[]);
                  setDrivers((driversResult.data ?? []) as Driver[]);
                  setAuditRows((auditResult.data ?? []) as AuditEntry[]);
                  setLastLoadedAt(new Date().toLocaleString());
                }

                setIsLoading(false);
              })();
            }}
            className="rounded border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="mb-6 grid gap-4 xl:grid-cols-[360px_1fr]">
        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold">Filtered users</h2>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Search by name, role, or profile ID.
              </p>
            </div>
          </div>

          <div className="space-y-3">
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search users"
              className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
            />

            <div className="flex flex-wrap gap-2">
              {(["all", "driver", "dispatch", "admin", "ops", "manager"] as const).map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setRoleFilter(role)}
                  className={`rounded-full border px-3 py-2 text-sm font-semibold transition ${
                    roleFilter === role
                      ? "border-blue-600 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-950 dark:text-blue-200"
                      : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800"
                  }`}
                >
                  {role === "all" ? "All" : role}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
            <table className="min-w-full divide-y divide-zinc-200 dark:divide-zinc-800">
              <thead className="bg-zinc-50 dark:bg-zinc-950">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    User
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Role
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Last login
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                {filteredProfiles.map((profile) => (
                  <tr
                    key={profile.id}
                    className={`cursor-pointer transition hover:bg-zinc-100 dark:hover:bg-zinc-800 ${
                      profile.id === selectedProfileId ? "bg-blue-50 dark:bg-blue-950/50" : ""
                    }`}
                    onClick={() => setSelectedProfileId(profile.id)}
                  >
                    <td className="px-3 py-3 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                      {getProfileDisplayName(profile)}
                    </td>
                    <td className="px-3 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                      {profile.role || "unknown"}
                    </td>
                    <td className="px-3 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                      {formatDate(profile.last_login_at)}
                    </td>
                  </tr>
                ))}
                {filteredProfiles.length === 0 && (
                  <tr>
                    <td colSpan={3} className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                      No users match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
          {isLoading ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Loading audit details…</div>
          ) : errorMessage ? (
            <div className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
              {errorMessage}
            </div>
          ) : !selectedProfile ? (
            <div className="text-sm text-zinc-600 dark:text-zinc-400">Select a user to view activity.</div>
          ) : (
            <>
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold">{getProfileDisplayName(selectedProfile)}</h2>
                  <p className="text-sm text-zinc-600 dark:text-zinc-400">
                    Profile ID: {selectedProfile.id}
                  </p>
                </div>
                <span className="inline-flex rounded-full border border-zinc-300 bg-zinc-100 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                  {selectedProfile.role ?? "unknown"}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Driver link</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedProfile.driver_id ? selectedDriverName : "Not applicable"}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Last login</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedProfile.last_login_at ? formatDate(selectedProfile.last_login_at) : "Not tracked"}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Account created</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {formatDate(selectedProfile.created_at)}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Recent events</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {selectedUserActivity.length}
                  </div>
                </div>
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900">
                  <div className="text-xs uppercase tracking-wide text-zinc-500 dark:text-zinc-400">Total audit rows</div>
                  <div className="mt-1 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                    {totalActivityCount}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-base font-semibold">Audit history</h3>
                <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  View recent changes across all users, or narrow results by date range.
                </p>
              </div>

              <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">Filtered audit history</h2>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400">
                      Showing availability audit entries for the currently filtered user set.
                    </p>
                  </div>
                  <span className="inline-flex rounded-full border border-zinc-300 bg-zinc-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200">
                    Total {filteredAuditRows.length}
                  </span>
                </div>

                <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                  <div className="grid gap-3 sm:grid-cols-2">
                    <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                      Start date
                      <input
                        type="date"
                        value={historyStartDate}
                        onChange={(event) => setHistoryStartDate(event.target.value)}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm text-zinc-700 dark:text-zinc-300">
                      End date
                      <input
                        type="date"
                        value={historyEndDate}
                        onChange={(event) => setHistoryEndDate(event.target.value)}
                        className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-200 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 dark:focus:border-blue-400 dark:focus:ring-blue-900"
                      />
                    </label>
                  </div>

                  <div className="flex items-end justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryStartDate("");
                        setHistoryEndDate("");
                      }}
                      className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                    >
                      Clear dates
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAllHistory((current) => !current)}
                      className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      {showAllHistory ? "Show recent only" : "Show all"}
                    </button>
                  </div>
                </div>

                {isLoading ? (
                  <div className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">Loading audit history…</div>
                ) : errorMessage ? (
                  <div className="mt-4 rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
                    {errorMessage}
                  </div>
                ) : (
                  <>
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 dark:border-zinc-800 dark:bg-zinc-950">
                      <div className="text-sm text-zinc-700 dark:text-zinc-300">
                        {showAllHistory ? "Showing all" : "Showing latest 8"} of {filteredAuditRows.length} matching entries.
                      </div>
                      {historyStartDate || historyEndDate ? (
                        <div className="text-sm text-zinc-500 dark:text-zinc-400">
                          Date range: {historyStartDate || "any"} – {historyEndDate || "any"}
                        </div>
                      ) : null}
                    </div>

                    <div className="mt-4 overflow-hidden rounded-xl border border-zinc-200 dark:border-zinc-800">
                      <div className="overflow-x-auto">
                        <table className="min-w-full table-auto divide-y divide-zinc-200 dark:divide-zinc-800">
                          <thead className="bg-zinc-50 dark:bg-zinc-950">
                            <tr>
                              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                When
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Actor
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Action
                              </th>
                              <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                                Details
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 bg-white dark:divide-zinc-800 dark:bg-zinc-900">
                            {displayedAuditRows.map((entry) => (
                              <tr key={entry.id}>
                                <td className="max-w-[12rem] break-words whitespace-normal px-3 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                                  {formatDate(entry.created_at)}
                                </td>
                                <td className="max-w-[10rem] break-words whitespace-normal px-3 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                                  {entry.actor_name || entry.actor_role || entry.actor_profile_id || "Unknown"}
                                </td>
                                <td className="max-w-[10rem] break-words whitespace-normal px-3 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                                  {entry.action.replace("availability.", "")}
                                </td>
                                <td className="max-w-[20rem] break-words whitespace-normal px-3 py-3 text-sm text-zinc-600 dark:text-zinc-300">
                                  {entry.details ?? "—"}
                                </td>
                              </tr>
                            ))}
                            {displayedAuditRows.length === 0 && (
                              <tr>
                                <td colSpan={4} className="px-3 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
                                  No audit rows match this filter.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          )}
        </section>
        </div>
      </main>
      );
    }
