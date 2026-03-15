"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DriverApprovalStatus = "pending" | "approved" | "blocked";

type Driver = {
  id: string;
  full_name: string;
  vehicle_label: string | null;
  approval_status: DriverApprovalStatus;
};

type AvailabilitySlot = {
  id: string;
  driver_id: string;
  service_date: string;
  start_time: string;
  end_time: string;
};

function localDateIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function formatDateLabel(value: string) {
  const d = parseLocalDate(value);
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "numeric",
    day: "numeric",
  });
}

function formatTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return `${hour12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

function getDateRange(start: string, end: string) {
  const dates: string[] = [];
  const current = parseLocalDate(start);
  const endDate = parseLocalDate(end);

  while (current <= endDate) {
    dates.push(localDateIso(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

export default function AvailabilityPage() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [serviceDate, setServiceDate] = useState(localDateIso(new Date()));
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [rangeStartDate, setRangeStartDate] = useState(localDateIso(new Date()));
  const [rangeEndDate, setRangeEndDate] = useState(localDateIso(new Date()));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentRole, setCurrentRole] = useState<"dispatch" | "driver" | null>(null);
  const [currentProfileDriverId, setCurrentProfileDriverId] = useState<string | null>(null);

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/driver-login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role, driver_id")
        .eq("id", user.id)
        .single();

      if (error || !profile) {
        await supabase.auth.signOut();
        router.push("/driver-login");
        return;
      }

      if (profile.role === "driver") {
        if (!profile.driver_id) {
          setErrorMessage("No driver record is linked to this account.");
          return;
        }

        setCurrentRole("driver");
        setCurrentProfileDriverId(profile.driver_id);
        setSelectedDriverId(profile.driver_id);
      } else if (profile.role === "dispatch") {
        setCurrentRole("dispatch");
      } else {
        await supabase.auth.signOut();
        router.push("/driver-login");
        return;
      }

      setAuthChecked(true);
    }

    checkAccess();
  }, [router]);

  useEffect(() => {
    if (!authChecked) return;

    async function loadDrivers() {
      const query = supabase
        .from("drivers")
        .select("*")
        .in("approval_status", ["pending", "approved"])
        .order("full_name");

      const { data, error } = await query;

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const driverRows = (data ?? []) as Driver[];
      setDrivers(driverRows);

      if (currentRole === "dispatch") {
        if (driverRows.length > 0) {
          setSelectedDriverId((current) => current || driverRows[0].id);
        }
      } else if (currentRole === "driver" && currentProfileDriverId) {
        setSelectedDriverId(currentProfileDriverId);
      }
    }

    loadDrivers();
  }, [authChecked, currentRole, currentProfileDriverId]);

  useEffect(() => {
    if (!authChecked || !selectedDriverId) return;

    async function loadSlots() {
      const { data, error } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("driver_id", selectedDriverId)
        .gte("service_date", localDateIso(new Date()))
        .order("service_date")
        .order("start_time");

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSlots((data ?? []) as AvailabilitySlot[]);
    }

    loadSlots();
  }, [authChecked, selectedDriverId]);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId]
  );

  const weekDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return {
        iso: localDateIso(d),
        labelTop: d.toLocaleDateString("en-US", { weekday: "short" }),
        labelBottom: d.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
      };
    });
  }, []);

  const slotsByDate = useMemo(() => {
    const map: Record<string, AvailabilitySlot[]> = {};
    for (const slot of slots) {
      if (!map[slot.service_date]) map[slot.service_date] = [];
      map[slot.service_date].push(slot);
    }
    return map;
  }, [slots]);

  async function refreshSlots(driverId: string) {
    const { data, error } = await supabase
      .from("availability_slots")
      .select("*")
      .eq("driver_id", driverId)
      .gte("service_date", localDateIso(new Date()))
      .order("service_date")
      .order("start_time");

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSlots((data ?? []) as AvailabilitySlot[]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedDriverId) {
      setErrorMessage("Please select a driver.");
      return;
    }

    if (currentRole === "driver" && currentProfileDriverId && selectedDriverId !== currentProfileDriverId) {
      setErrorMessage("You can only submit availability for your own driver record.");
      return;
    }

    if (endTime <= startTime) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    if (dateMode === "range" && rangeEndDate < rangeStartDate) {
      setErrorMessage("End date must be the same as or after start date.");
      return;
    }

    const selectedDates =
      dateMode === "single"
        ? [serviceDate]
        : getDateRange(rangeStartDate, rangeEndDate);

    setIsSaving(true);

    const { error } = await supabase.from("availability_slots").insert(
      selectedDates.map((date) => ({
        driver_id: selectedDriverId,
        service_date: date,
        start_time: startTime,
        end_time: endTime,
      }))
    );

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage(
      `Availability saved for ${selectedDates.length} date${
        selectedDates.length === 1 ? "" : "s"
      }.`
    );
    await refreshSlots(selectedDriverId);
  }

  async function handleDelete(slotId: string) {
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase
      .from("availability_slots")
      .delete()
      .eq("id", slotId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Availability removed.");
    await refreshSlots(selectedDriverId);
  }

  if (!authChecked) {
    return <div className="p-10 text-sm text-gray-500">Checking access...</div>;
  }

  return (
    <main className="mx-auto max-w-5xl p-8">
      <h1 className="mb-2 text-2xl font-semibold">Availability Submission</h1>
      <p className="mb-6 text-sm text-gray-500">
        Drivers can submit one or more availability windows per day. Dispatch
        can use this same page for quick updates.
      </p>

      {errorMessage && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">
          {successMessage}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[420px,1fr]">
        <section className="rounded-xl border border-white-500 p-5 shadow-sm">
          <h2 className="mb-4 text-lg font-medium">Add Availability</h2>

          <form className="space-y-4" onSubmit={handleSubmit}>
            {currentRole === "dispatch" && (
              <div>
                <label className="mb-1 block text-sm font-medium">Driver</label>
                <select
                  value={selectedDriverId}
                  onChange={(e) => setSelectedDriverId(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                >
                  {drivers.map((driver) => (
                    <option key={driver.id} value={driver.id}>
                      {driver.full_name}
                      {driver.vehicle_label ? ` — ${driver.vehicle_label}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {currentRole === "driver" && selectedDriver && (
              <div className="rounded border border-gray-200 bg-white p-3 text-sm text-right">
                <div className="font-medium text-gray-900">{selectedDriver.full_name}</div>
                <div className="text-gray-500">
                  {selectedDriver.vehicle_label ? selectedDriver.vehicle_label : "No vehicle"}
                </div>
              </div>
            )}

            <div>
              <label className="mb-1 block text-sm font-medium">Date mode</label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="dateMode"
                    value="single"
                    checked={dateMode === "single"}
                    onChange={() => setDateMode("single")}
                    className="h-4 w-4"
                  />
                  Single date
                </label>
                <label className="flex items-center gap-1 text-sm">
                  <input
                    type="radio"
                    name="dateMode"
                    value="range"
                    checked={dateMode === "range"}
                    onChange={() => setDateMode("range")}
                    className="h-4 w-4"
                  />
                  Date range
                </label>
              </div>
            </div>

            {dateMode === "single" ? (
              <div>
                <label className="mb-1 block text-sm font-medium">Date</label>
                <input
                  type="date"
                  value={serviceDate}
                  onChange={(e) => setServiceDate(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium">Start date</label>
                  <input
                    type="date"
                    value={rangeStartDate}
                    onChange={(e) => setRangeStartDate(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">End date</label>
                  <input
                    type="date"
                    value={rangeEndDate}
                    onChange={(e) => setRangeEndDate(e.target.value)}
                    className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium">Start time</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">End time</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Save availability"}
            </button>
          </form>
        </section>

        <section className="rounded-xl border bg-white-100 p-5 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-medium">Existing Availability</h2>
            {selectedDriver && (
              <p className="text-sm text-gray-500">
                {selectedDriver.full_name}
                {selectedDriver.vehicle_label
                  ? ` — ${selectedDriver.vehicle_label}`
                  : ""}
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {weekDays.map((day) => {
              const daySlots = slotsByDate[day.iso] ?? [];
              return (
                <div
                  key={day.iso}
                  className="rounded border border-gray-200 bg-white p-3"
                >
                  <div className="mb-2 text-center text-xs font-medium text-gray-500">
                    <div>{day.labelTop}</div>
                    <div>{day.labelBottom}</div>
                  </div>
                  {daySlots.length === 0 ? (
                    <p className="rounded border border-dashed p-2 text-center text-xs text-gray-400">
                      —
                    </p>
                  ) : (
                    <div className="space-y-1">
                      {daySlots.map((slot) => (
                        <div
                          key={slot.id}
                          className="rounded border border-gray-200 bg-gray-50 p-2 text-xs"
                        >
                          <div className="mb-1 font-medium text-gray-700">
                            {formatTime(slot.start_time)} - {formatTime(slot.end_time)}
                          </div>
                          <button
                            onClick={() => handleDelete(slot.id)}
                            className="w-full rounded border border-red-300 bg-red-50 px-1 py-1 text-[11px] text-red-700 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}