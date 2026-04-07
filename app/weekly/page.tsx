"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DriverApprovalStatus = "pending" | "approved" | "blocked";
type AppRole = "admin" | "dispatch";

type Driver = {
  id: string;
  full_name: string;
  vehicle_label: string | null;
  approval_status: DriverApprovalStatus;
  email?: string | null;
};

type AvailabilitySlot = {
  id: string;
  driver_id: string;
  service_date: string;
  start_time: string;
  end_time: string;
  availability_type: "available" | "unavailable";
};

function getWeekDays(dayCount: number = 7) {
  const today = new Date();
  const days: { labelTop: string; labelBottom: string; iso: string }[] = [];

  for (let i = 0; i < dayCount; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    const labelTop = d.toLocaleDateString("en-US", { weekday: "short" });
    const labelBottom = d.toLocaleDateString("en-US", {
      month: "numeric",
      day: "numeric",
    });

    days.push({ labelTop, labelBottom, iso });
  }

  return days;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  return hours * 60 + minutes;
}

function formatTimelineLabel(hour: number) {
  if (hour === 12) return "12p";
  if (hour === 24 || hour === 0) return "12a";
  if (hour < 12) return `${hour}a`;
  return `${hour - 12}p`;
}

function formatSlotTime(value: string) {
  const [hours, minutes] = value.slice(0, 5).split(":").map(Number);
  const suffix = hours >= 12 ? "pm" : "am";
  const hour12 = hours % 12 === 0 ? 12 : hours % 12;
  return minutes === 0
    ? `${hour12}${suffix}`
    : `${hour12}:${minutes.toString().padStart(2, "0")} ${suffix}`;
}

function addDaysToIso(baseIso: string, days: number): string {
  const [y, m, d] = baseIso.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function makeDayEntry(iso: string): { labelTop: string; labelBottom: string; iso: string } {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return {
    iso,
    labelTop: date.toLocaleDateString("en-US", { weekday: "short" }),
    labelBottom: date.toLocaleDateString("en-US", { month: "numeric", day: "numeric" }),
  };
}

function getDatesInRange(startIso: string, endIso: string) {
  const results: ReturnType<typeof makeDayEntry>[] = [];
  let current = startIso;
  while (current <= endIso) {
    results.push(makeDayEntry(current));
    current = addDaysToIso(current, 1);
  }
  return results;
}

function overlapsExisting(
  startTime: string,
  endTime: string,
  existingSlots: AvailabilitySlot[],
  ignoreSlotId?: string
) {
  const newStart = timeToMinutes(startTime);
  const newEnd = timeToMinutes(endTime);

  return existingSlots.some((slot) => {
    if (ignoreSlotId && slot.id === ignoreSlotId) return false;

    const existingStart = timeToMinutes(slot.start_time);
    const existingEnd = timeToMinutes(slot.end_time);

    return newStart < existingEnd && newEnd > existingStart;
  });
}

function DayTimeline({
  slots,
  isToday,
  driverStatus,
}: {
  slots: AvailabilitySlot[];
  isToday: boolean;
  driverStatus: DriverApprovalStatus;
}) {
  const timelineStart = 5 * 60;
  const timelineEnd = 23 * 60;
  const totalMinutes = timelineEnd - timelineStart;
  const ticks = [5, 8, 11, 14, 17, 20, 23];
  const timelineHeight = Math.max(56, slots.length * 24 + 12);

  return (
    <div className="min-w-[220px]">
      <div className="mb-1 flex justify-between text-xs text-gray-500">
        {ticks.map((hour) => (
          <span key={hour}>{formatTimelineLabel(hour)}</span>
        ))}
      </div>

      <div
        className="relative overflow-hidden rounded bg-gray-900/40"
        style={{ height: `${timelineHeight}px` }}
      >
        <div className="absolute inset-y-0 left-0 w-[39%] bg-gray-800/20" />
        <div className="absolute inset-y-0 left-[39%] w-[33%] bg-gray-700/10" />
        <div className="absolute inset-y-0 right-0 w-[28%] bg-gray-800/20" />

        {ticks.map((hour) => {
          const left = ((hour * 60 - timelineStart) / totalMinutes) * 100;
          return (
            <div
              key={hour}
              className="absolute top-0 h-full w-px bg-gray-700"
              style={{ left: `${left}%` }}
            />
          );
        })}

        {isToday &&
          (() => {
            const now = new Date();
            const currentMinutes = now.getHours() * 60 + now.getMinutes();
            if (currentMinutes >= timelineStart && currentMinutes <= timelineEnd) {
              const lineLeft = ((currentMinutes - timelineStart) / totalMinutes) * 100;
              return (
                <div
                  className="absolute inset-y-0 w-px bg-red-500 opacity-90"
                  style={{ left: `${lineLeft}%` }}
                />
              );
            }
            return null;
          })()}

        {slots.map((slot, index) => {
          const start = timeToMinutes(slot.start_time);
          const end = timeToMinutes(slot.end_time);
          const isFullDayUnavailable =
            slot.availability_type === "unavailable" && start === 0 && end === 0;
          const actualStart = isFullDayUnavailable ? timelineStart : start;
          const actualEnd = isFullDayUnavailable ? timelineEnd : end;
          const left = ((actualStart - timelineStart) / totalMinutes) * 100;
          const width = ((actualEnd - actualStart) / totalMinutes) * 100;

          const barClasses =
            slot.availability_type === "unavailable"
              ? "bg-red-500 text-white"
              : driverStatus === "pending"
              ? "bg-amber-500 text-white"
              : "bg-blue-500 text-white";

          const label =
            slot.availability_type === "unavailable"
              ? isFullDayUnavailable
                ? "Unavailable"
                : "Unavail " + formatSlotTime(slot.start_time) + "-" + formatSlotTime(slot.end_time)
              : formatSlotTime(slot.start_time) + "-" + formatSlotTime(slot.end_time);

          return (
            <div
              key={slot.id}
              className={"absolute h-5 rounded text-[10px] " + barClasses}
              style={{
                top: (8 + index * 22) + "px",
                left: left + "%",
                width: Math.max(width, 4) + "%",
              }}
            >
              <div className="flex h-full items-center justify-center truncate px-1">
                {label}
              </div>
            </div>
          );
        })}

        {slots.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-500">
            —
          </div>
        )}
      </div>
    </div>
  );
}

export default function WeeklyPage() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"day" | 3 | 7 | "all">(7);
  const [selectedDay, setSelectedDay] = useState(() => {
    const t = new Date();
    return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;
  });
  const [editingCell, setEditingCell] = useState<{
    driverId: string;
    serviceDate: string;
  } | null>(null);
  const [newSlot, setNewSlot] = useState({ start_time: "08:00", end_time: "10:00", availability_type: "available" as "available" | "unavailable" });
  const [editedSlots, setEditedSlots] = useState<
    Record<string, { start_time: string; end_time: string; availability_type: "available" | "unavailable" }>
  >({});
  const [isSavingCell, setIsSavingCell] = useState(false);
  const [confirmRemoveDriverId, setConfirmRemoveDriverId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);

  const [isAddDriverOpen, setIsAddDriverOpen] = useState(false);
  const [newDriverName, setNewDriverName] = useState("");
  const [newDriverEmail, setNewDriverEmail] = useState("");
  const [newDriverVehicle, setNewDriverVehicle] = useState("");
  const [isAddingDriver, setIsAddingDriver] = useState(false);

  const now = new Date();
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const weekDays = useMemo(() => {
    if (viewMode === "day") {
      return [makeDayEntry(selectedDay)];
    }
    if (viewMode === "all") {
      const futureDates = [...new Set(slots.map((s) => s.service_date))]
        .filter((d) => d >= todayIso)
        .sort();
      if (futureDates.length === 0) return [makeDayEntry(todayIso)];
      return getDatesInRange(futureDates[0], futureDates[futureDates.length - 1]);
    }
    return getWeekDays(viewMode);
  }, [viewMode, selectedDay, slots, todayIso]);

  const activeNowDriverIds = useMemo(() => {
    const current = new Date();
    const nowMinutes = current.getHours() * 60 + current.getMinutes();
    return new Set(
      slots
        .filter(
          (slot) =>
            slot.service_date === todayIso &&
            timeToMinutes(slot.start_time) <= nowMinutes &&
            nowMinutes < timeToMinutes(slot.end_time)
        )
        .map((slot) => slot.driver_id)
    );
  }, [slots, todayIso]);

  const todayDriverIds = useMemo(() => {
    return new Set(
      slots.filter((slot) => slot.service_date === todayIso).map((slot) => slot.driver_id)
    );
  }, [slots, todayIso]);

  const selectedDayDriverIds = useMemo(() => {
    if (viewMode !== "day") return new Set<string>();
    return new Set(
      slots
        .filter((slot) => slot.service_date === selectedDay)
        .map((slot) => slot.driver_id)
    );
  }, [slots, selectedDay, viewMode]);

  const unavailableDriverIds = useMemo(() => {
    return new Set(
      slots
        .filter(
          (slot) => slot.service_date === todayIso && slot.availability_type === "unavailable"
        )
        .map((slot) => slot.driver_id)
    );
  }, [slots, todayIso]);

  const sortedDrivers = useMemo(() => {
    const getFirstName = (name: string) => name.split(" ")[0]?.toLowerCase() ?? "";

    return [...drivers].sort((a, b) => {
      const aUnavailable = unavailableDriverIds.has(a.id);
      const bUnavailable = unavailableDriverIds.has(b.id);
      if (aUnavailable !== bUnavailable) return aUnavailable ? 1 : -1;

      if (viewMode === "day") {
        const aHasSelectedDaySlot = selectedDayDriverIds.has(a.id);
        const bHasSelectedDaySlot = selectedDayDriverIds.has(b.id);
        if (aHasSelectedDaySlot !== bHasSelectedDaySlot) {
          return aHasSelectedDaySlot ? -1 : 1;
        }

        return a.full_name.localeCompare(b.full_name);
      }

      const aActive = activeNowDriverIds.has(a.id);
      const bActive = activeNowDriverIds.has(b.id);
      if (aActive !== bActive) return aActive ? -1 : 1;

      const aToday = todayDriverIds.has(a.id);
      const bToday = todayDriverIds.has(b.id);
      if (aToday !== bToday) return aToday ? -1 : 1;

      const aPending = a.approval_status === "pending";
      const bPending = b.approval_status === "pending";
      if (aPending !== bPending) return aPending ? 1 : -1;

      const aFirst = getFirstName(a.full_name);
      const bFirst = getFirstName(b.full_name);
      return aFirst.localeCompare(bFirst);
    });
  }, [drivers, unavailableDriverIds, activeNowDriverIds, todayDriverIds, viewMode, selectedDayDriverIds]);

  useEffect(() => {
    async function checkAccess() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile, error } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (
        error ||
        !profile ||
        (profile.role !== "dispatch" && profile.role !== "admin")
      ) {
        await supabase.auth.signOut();
        router.push("/login");
        return;
      }

      setCurrentRole(profile.role as AppRole);
      setAuthChecked(true);
    }

    checkAccess();
  }, [router]);

  const loadData = useCallback(async () => {
    const t = new Date();
    const todayStr = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, "0")}-${String(t.getDate()).padStart(2, "0")}`;

    let rangeStart: string;
    let rangeEnd: string;

    if (viewMode === "day") {
      rangeStart = selectedDay;
      rangeEnd = selectedDay;
    } else if (viewMode === "all") {
      rangeStart = todayStr;
      rangeEnd = addDaysToIso(todayStr, 365);
    } else {
      rangeStart = todayStr;
      rangeEnd = addDaysToIso(todayStr, viewMode - 1);
    }

    setErrorMessage(null);

    const [
      { data: driverData, error: driverError },
      { data: slotData, error: slotError },
    ] = await Promise.all([
      supabase
        .from("drivers")
        .select("*")
        .neq("approval_status", "blocked")
        .order("full_name"),
      supabase
        .from("availability_slots")
        .select("*")
        .gte("service_date", rangeStart)
        .lte("service_date", rangeEnd)
        .order("service_date")
        .order("start_time"),
    ]);

    if (driverError) {
      setErrorMessage(driverError.message);
      return;
    }

    if (slotError) {
      setErrorMessage(slotError.message);
      return;
    }

    setDrivers((driverData ?? []) as Driver[]);
    setSlots((slotData ?? []) as AvailabilitySlot[]);
  }, [viewMode, selectedDay]);

  useEffect(() => {
    if (!authChecked) return;

    const loadTimer = window.setTimeout(() => {
      void loadData();
    }, 0);

    const channel = supabase
      .channel("weekly_board_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "availability_slots" },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drivers" },
        () => loadData()
      )
      .subscribe();

    return () => {
      window.clearTimeout(loadTimer);
      supabase.removeChannel(channel);
    };
  }, [authChecked, loadData]);

  const slotsByDriverAndDay = useMemo(() => {
    const map: Record<string, AvailabilitySlot[]> = {};
    for (const slot of slots) {
      const key = `${slot.driver_id}_${slot.service_date}`;
      if (!map[key]) map[key] = [];
      map[key].push(slot);
    }
    return map;
  }, [slots]);

  const activeCellSlots = editingCell
    ? slotsByDriverAndDay[`${editingCell.driverId}_${editingCell.serviceDate}`] ?? []
    : [];

  async function handleAddSlot() {
    if (!editingCell) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    if (newSlot.end_time <= newSlot.start_time) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    if (overlapsExisting(newSlot.start_time, newSlot.end_time, activeCellSlots)) {
      setErrorMessage("This slot overlaps another availability window.");
      return;
    }

    setIsSavingCell(true);

    const { error } = await supabase.from("availability_slots").insert({
      driver_id: editingCell.driverId,
      service_date: editingCell.serviceDate,
      start_time: newSlot.start_time,
      end_time: newSlot.end_time,
      availability_type: newSlot.availability_type,
    });

    setIsSavingCell(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Availability added.");
    setNewSlot({ start_time: "08:00", end_time: "10:00", availability_type: "available" });
    await loadData();
  }

  async function handleDeleteSlot(slotId: string) {
    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSavingCell(true);

    const { error } = await supabase.from("availability_slots").delete().eq("id", slotId);

    setIsSavingCell(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Availability removed.");
    await loadData();
  }

  async function handleUpdateSlot(slot: AvailabilitySlot) {
    const target = editedSlots[slot.id] ?? {
      start_time: slot.start_time,
      end_time: slot.end_time,
      availability_type: slot.availability_type,
    };

    setErrorMessage(null);
    setSuccessMessage(null);

    if (target.end_time <= target.start_time) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    if (overlapsExisting(target.start_time, target.end_time, activeCellSlots, slot.id)) {
      setErrorMessage("This slot overlaps another availability window.");
      return;
    }

    setIsSavingCell(true);

    const { error } = await supabase
      .from("availability_slots")
      .update({
        start_time: target.start_time,
        end_time: target.end_time,
        availability_type: target.availability_type,
      })
      .eq("id", slot.id);

    setIsSavingCell(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setEditedSlots((prev) => {
      const next = { ...prev };
      delete next[slot.id];
      return next;
    });

    setSuccessMessage("Availability updated.");
    await loadData();
  }

  async function handleSetDriverStatus(driverId: string, status: DriverApprovalStatus) {
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase
      .from("drivers")
      .update({ approval_status: status })
      .eq("id", driverId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setConfirmRemoveDriverId(null);
    setSuccessMessage(
      status === "approved" ? "Driver approved." : "Driver removed from schedule."
    );
    await loadData();
  }

  async function handleAddDriver() {
    setErrorMessage(null);
    setSuccessMessage(null);

    const fullName = newDriverName.trim();
    const email = newDriverEmail.trim().toLowerCase();
    const vehicleLabel = newDriverVehicle.trim();

    if (!fullName) {
      setErrorMessage("Driver name is required.");
      return;
    }

    if (!email) {
      setErrorMessage("Driver email is required.");
      return;
    }

    setIsAddingDriver(true);

    const { error: insertError } = await supabase.from("drivers").insert([
      {
        full_name: fullName,
        email,
        vehicle_label: vehicleLabel || null,
        approval_status: "approved",
      },
    ]);

    if (insertError) {
      setIsAddingDriver(false);
      setErrorMessage(
        insertError.message ||
          insertError.details ||
          insertError.hint ||
          "Unable to add driver."
      );
      return;
    }

    const { error: magicLinkError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/driver-set-password`,
      },
    });

    setIsAddingDriver(false);

    setNewDriverName("");
    setNewDriverEmail("");
    setNewDriverVehicle("");
    setIsAddDriverOpen(false);

    if (magicLinkError) {
      setSuccessMessage("Driver added.");
      setErrorMessage(
        `Driver added, but setup email could not be sent: ${magicLinkError.message}`
      );
      await loadData();
      return;
    }

    setSuccessMessage("Driver added and setup email sent.");
    await loadData();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  const tableMinWidth =
    viewMode === "day" ? "min-w-[720px]" : viewMode === 3 ? "min-w-[900px]" : "min-w-[1200px]";
  const compactDriverColumn = viewMode === "day" || viewMode === 3;

  if (!authChecked) {
    return <div className="min-h-screen p-10 text-sm text-gray-500">Checking access...</div>;
  }

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Accell - Weekly Driver Availability</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage driver schedules and move between weekly and availability views.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => router.push("/weekly")}
            className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white"
          >
            Weekly
          </button>

          <button
            onClick={() => router.push("/availability")}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Availability
          </button>

          <input
            type="date"
            value={selectedDay}
            min={todayIso}
            onChange={(e) => {
              if (!e.target.value) return;
              setSelectedDay(e.target.value);
              setViewMode("day");
            }}
            className={`rounded border px-2 py-1.5 text-sm ${
              viewMode === "day"
                ? "border-blue-700 bg-blue-700 text-white [color-scheme:dark]"
                : "border-gray-300 bg-white text-gray-700"
            }`}
          />

          {([3, 7, "all"] as const).map((n) => (
            <button
              key={String(n)}
              onClick={() => setViewMode(n)}
              className={`rounded px-3 py-2 text-sm font-medium ${
                viewMode === n
                  ? "bg-blue-700 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              {n === 3 ? "3 day" : n === 7 ? "7 day" : "All"}
            </button>
          ))}

          <button
            onClick={() => setIsAddDriverOpen(true)}
            disabled={isAddingDriver}
            className="rounded bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            Add driver
          </button>

          <button
            onClick={() => loadData()}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Refresh
          </button>

          <button
            onClick={handleLogout}
            className="rounded border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
      </div>

      {currentRole === "admin" && (
        <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
          Admin access enabled
        </div>
      )}

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

      <div className="relative max-h-[70vh] overflow-x-auto overflow-y-auto">
        <table className={`w-full table-auto border-collapse ${tableMinWidth}`}>
          <thead>
            <tr className="border-b shadow-lg">
              <th
                className={`sticky top-0 z-30 bg-black/90 px-2 py-3 text-lg font-bold text-gray-300 ${
                  compactDriverColumn ? "w-px whitespace-nowrap text-right" : "text-right"
                }`}
              >
                Driver
              </th>
              {weekDays.map((day) => {
                const isToday = day.iso === todayIso;

                return (
                  <th
                    key={day.iso}
                    className={`sticky top-0 z-20 bg-black/90 p-2 text-center text-lg font-bold text-gray-300 ${
                      isToday ? "bg-black/95 text-white" : ""
                    }`}
                  >
                    <div>{day.labelTop}</div>
                    <div className="text-gray-400">{day.labelBottom}</div>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {sortedDrivers.map((driver) => (
              <tr key={driver.id} className="border-b align-top">
                <td
                  className={`p-2 align-top text-right ${
                    compactDriverColumn ? "w-px whitespace-nowrap" : ""
                  }`}
                >
                  <div className="ml-auto flex w-fit flex-wrap items-center justify-end gap-1">
                    <span className="text-sm font-medium">{driver.full_name}</span>

                    {driver.approval_status === "pending" && (
                      <>
                        <span className="rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800">
                          Pending
                        </span>

                        <button
                          onClick={() => handleSetDriverStatus(driver.id, "approved")}
                          className="rounded bg-blue-600 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-blue-700"
                        >
                          Approve
                        </button>
                      </>
                    )}

                    {confirmRemoveDriverId === driver.id ? (
                      <>
                        <span className="text-[10px] text-red-600">Confirm?</span>
                        <button
                          onClick={() => handleSetDriverStatus(driver.id, "blocked")}
                          className="rounded bg-red-600 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-red-700"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setConfirmRemoveDriverId(null)}
                          className="rounded border px-1.5 py-0.5 text-[10px] font-medium text-gray-700"
                        >
                          No
                        </button>
                      </>
                    ) : (
                      <button
                        onClick={() => setConfirmRemoveDriverId(driver.id)}
                        className="rounded border border-red-300 bg-red-50 px-1 py-0.5 text-[10px] font-medium text-red-700 hover:bg-red-100"
                      >
                        R
                      </button>
                    )}
                  </div>

                  <div className="ml-auto w-fit text-right text-xs text-gray-500">
                    {driver.vehicle_label}
                  </div>
                </td>

                {weekDays.map((day) => {
                  const key = `${driver.id}_${day.iso}`;
                  const daySlots = slotsByDriverAndDay[key] ?? [];
                  const isToday = day.iso === todayIso;

                  return (
                    <td
                      key={day.iso}
                      className={`p-3 align-top ${isToday ? "bg-blue-900/10" : ""}`}
                      onClick={() =>
                        setEditingCell({ driverId: driver.id, serviceDate: day.iso })
                      }
                      style={{ cursor: "pointer" }}
                    >
                      <DayTimeline
                        slots={daySlots}
                        isToday={isToday}
                        driverStatus={driver.approval_status}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}

            {drivers.length === 0 && !errorMessage && (
              <tr>
                <td colSpan={weekDays.length + 1} className="p-4 text-sm text-gray-500">
                  No drivers found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isAddDriverOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl bg-gray-100 p-5 text-black shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">Add driver</h2>
              <button
                onClick={() => setIsAddDriverOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Driver name</label>
                <input
                  type="text"
                  value={newDriverName}
                  onChange={(e) => setNewDriverName(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  placeholder="Alex Ramirez"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Email</label>
                <input
                  type="email"
                  value={newDriverEmail}
                  onChange={(e) => setNewDriverEmail(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  placeholder="alex@example.com"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Vehicle</label>
                <input
                  type="text"
                  value={newDriverVehicle}
                  onChange={(e) => setNewDriverVehicle(e.target.value)}
                  className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
                  placeholder="Van 4"
                />
              </div>

              <button
                onClick={handleAddDriver}
                disabled={isAddingDriver}
                className="w-full rounded bg-green-600 px-4 py-2 text-white disabled:opacity-50"
              >
                {isAddingDriver ? "Saving..." : "Save and send setup email"}
              </button>
            </div>
          </div>
        </div>
      )}

      {editingCell && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg rounded-xl bg-gray-100 p-5 text-black shadow-xl">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-black">Edit availability</h2>
              <button
                onClick={() => setEditingCell(null)}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Close
              </button>
            </div>

            <div className="mb-3 text-sm text-gray-600">
              Driver: {drivers.find((d) => d.id === editingCell.driverId)?.full_name || "Unknown"}
              <br />
              Date: {editingCell.serviceDate}
            </div>

            <div className="space-y-2">
              {activeCellSlots.length === 0 ? (
                <p className="rounded border border-dashed p-2 text-xs text-gray-500">
                  No slots yet.
                </p>
              ) : (
                activeCellSlots.map((slot) => (
                  <div key={slot.id} className="rounded border border-gray-200 p-2">
                    <div className="mb-2 flex gap-2">
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name={`type-${slot.id}`}
                          value="available"
                          checked={(editedSlots[slot.id]?.availability_type ?? slot.availability_type) === "available"}
                          onChange={() =>
                            setEditedSlots((prev) => ({
                              ...prev,
                              [slot.id]: {
                                start_time: prev[slot.id]?.start_time ?? slot.start_time,
                                end_time: prev[slot.id]?.end_time ?? slot.end_time,
                                availability_type: "available",
                              },
                            }))
                          }
                        />
                        Available
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="radio"
                          name={`type-${slot.id}`}
                          value="unavailable"
                          checked={(editedSlots[slot.id]?.availability_type ?? slot.availability_type) === "unavailable"}
                          onChange={() =>
                            setEditedSlots((prev) => ({
                              ...prev,
                              [slot.id]: {
                                start_time: prev[slot.id]?.start_time ?? slot.start_time,
                                end_time: prev[slot.id]?.end_time ?? slot.end_time,
                                availability_type: "unavailable",
                              },
                            }))
                          }
                        />
                        Unavailable
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <input
                        value={editedSlots[slot.id]?.start_time ?? slot.start_time}
                        onChange={(e) => {
                          const updatedStart = e.target.value;
                          setEditedSlots((prev) => ({
                            ...prev,
                            [slot.id]: {
                              start_time: updatedStart,
                              end_time: prev[slot.id]?.end_time ?? slot.end_time,
                              availability_type: prev[slot.id]?.availability_type ?? slot.availability_type,
                            },
                          }));
                        }}
                        type="time"
                        className="w-1/2 rounded border p-1"
                      />
                      <input
                        value={editedSlots[slot.id]?.end_time ?? slot.end_time}
                        onChange={(e) => {
                          const updatedEnd = e.target.value;
                          setEditedSlots((prev) => ({
                            ...prev,
                            [slot.id]: {
                              start_time: prev[slot.id]?.start_time ?? slot.start_time,
                              end_time: updatedEnd,
                              availability_type: prev[slot.id]?.availability_type ?? slot.availability_type,
                            },
                          }));
                        }}
                        type="time"
                        className="w-1/2 rounded border p-1"
                      />
                    </div>
                    <div className="mt-2 flex gap-2">
                      <button
                        onClick={() => handleUpdateSlot(slot)}
                        className="rounded bg-green-600 px-2 py-1 text-xs font-medium text-white hover:bg-green-700"
                        disabled={isSavingCell}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleDeleteSlot(slot.id)}
                        className="rounded bg-red-500 px-2 py-1 text-xs font-medium text-white hover:bg-red-600"
                        disabled={isSavingCell}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 rounded border border-gray-200 p-3">
              <h3 className="mb-2 text-sm font-medium">Add slot</h3>
              <div className="mb-2 flex gap-2">
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="newType"
                    value="available"
                    checked={newSlot.availability_type === "available"}
                    onChange={() => setNewSlot((prev) => ({ ...prev, availability_type: "available" }))}
                  />
                  Available
                </label>
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="radio"
                    name="newType"
                    value="unavailable"
                    checked={newSlot.availability_type === "unavailable"}
                    onChange={() => setNewSlot((prev) => ({ ...prev, availability_type: "unavailable" }))}
                  />
                  Unavailable
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="time"
                  value={newSlot.start_time}
                  onChange={(e) => setNewSlot((prev) => ({ ...prev, start_time: e.target.value }))}
                  className="rounded border p-1"
                />
                <input
                  type="time"
                  value={newSlot.end_time}
                  onChange={(e) => setNewSlot((prev) => ({ ...prev, end_time: e.target.value }))}
                  className="rounded border p-1"
                />
              </div>
              <button
                onClick={handleAddSlot}
                className="mt-2 w-full rounded bg-blue-600 px-2 py-1 text-sm font-medium text-white hover:bg-blue-700"
                disabled={isSavingCell}
              >
                {isSavingCell ? "Saving..." : "Add slot"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}