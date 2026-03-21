"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type DriverApprovalStatus = "pending" | "approved" | "blocked";
type AppRole = "admin" | "dispatch" | "driver" | "ops" | "manager";
type AvailabilityType = "available" | "unavailable";

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
  availability_type: AvailabilityType;
};

type DispatchScheduleItem = {
  id: string;
  dispatcher_name: string;
  dispatcher_email: string | null;
  service_date: string;
  start_time: string;
  end_time: string;
  notes: string | null;
};

type DispatcherOption = {
  id: string;
  name: string | null;
  dispatch_email: string | null;
  role: string;
};

type WeekGroup<T> = {
  weekStartIso: string;
  days: {
    iso: string;
    labelTop: string;
    labelBottom: string;
    items: T[];
  }[];
};

function localDateIso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate()
  ).padStart(2, "0")}`;
}

function addDays(date: Date, daysToAdd: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + daysToAdd);
  return d;
}

function addDaysIso(start: Date, daysToAdd: number) {
  return localDateIso(addDays(start, daysToAdd));
}

function parseLocalDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - day);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatWeekRangeLabel(weekStartIso: string) {
  const start = parseLocalDate(weekStartIso);
  const end = addDays(start, 6);

  const startLabel = start.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const endLabel = end.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });

  return `Week of ${startLabel} - ${endLabel}`;
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

function buildWeeks<T extends { service_date: string }>(
  items: T[],
  weekCount: number,
  startDate: Date
): WeekGroup<T>[] {
  const firstWeekStart = startOfWeek(startDate);

  return Array.from({ length: weekCount }, (_, weekIndex) => {
    const weekStart = addDays(firstWeekStart, weekIndex * 7);
    const weekStartIso = localDateIso(weekStart);

    const days = Array.from({ length: 7 }, (_, dayIndex) => {
      const dayDate = addDays(weekStart, dayIndex);
      const iso = localDateIso(dayDate);

      return {
        iso,
        labelTop: dayDate.toLocaleDateString("en-US", { weekday: "short" }),
        labelBottom: dayDate.toLocaleDateString("en-US", {
          month: "numeric",
          day: "numeric",
        }),
        items: items.filter((item) => item.service_date === iso),
      };
    });

    return { weekStartIso, days };
  });
}

function groupItemsIntoWeeks<T extends { service_date: string }>(items: T[]) {
  const grouped = items.reduce<Record<string, T[]>>((acc, item) => {
    const weekStartIso = localDateIso(startOfWeek(parseLocalDate(item.service_date)));
    if (!acc[weekStartIso]) acc[weekStartIso] = [];
    acc[weekStartIso].push(item);
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([weekStartIso, weekItems]) => buildWeeks(weekItems, 1, parseLocalDate(weekStartIso))[0]);
}

function WeekViewButtons({
  value,
  onChange,
}: {
  value: 1 | 2 | "all";
  onChange: (value: 1 | 2 | "all") => void;
}) {
  const options: Array<1 | 2 | "all"> = [1, 2, "all"];

  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const label = option === 1 ? "1 week" : option === 2 ? "2 weeks" : "All";
        const isActive = value === option;

        return (
          <button
            key={String(option)}
            type="button"
            onClick={() => onChange(option)}
            className={`rounded px-3 py-2 text-sm font-medium ${
              isActive
                ? "bg-blue-700 text-white"
                : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700"
            }`}
          >
            {label}
          </button>
        );
      })}
    </div>
  );
}

export default function AvailabilityPage() {
  const router = useRouter();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [slots, setSlots] = useState<AvailabilitySlot[]>([]);
  const [dispatchSchedule, setDispatchSchedule] = useState<DispatchScheduleItem[]>([]);
  const [dispatchers, setDispatchers] = useState<DispatcherOption[]>([]);

  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [availabilityType, setAvailabilityType] = useState<AvailabilityType>("available");
  const [serviceDate, setServiceDate] = useState(localDateIso(new Date()));
  const [dateMode, setDateMode] = useState<"single" | "range">("single");
  const [rangeStartDate, setRangeStartDate] = useState(localDateIso(new Date()));
  const [rangeEndDate, setRangeEndDate] = useState(localDateIso(new Date()));
  const [startTime, setStartTime] = useState("08:00");
  const [endTime, setEndTime] = useState("10:00");
  const [allDayUnavailable, setAllDayUnavailable] = useState(false);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);
  const [currentRole, setCurrentRole] = useState<AppRole | null>(null);
  const [currentProfileDriverId, setCurrentProfileDriverId] = useState<string | null>(null);

  const [dispatchScheduleView, setDispatchScheduleView] = useState<1 | 2 | "all">(2);
  const [existingAvailabilityView, setExistingAvailabilityView] = useState<1 | 2 | "all">(2);
  const [isAddingDispatchShift, setIsAddingDispatchShift] = useState(false);
  const [dispatchForm, setDispatchForm] = useState({
    dispatcher_profile_id: "",
    date_mode: "single" as "single" | "range",
    service_date: localDateIso(new Date()),
    range_start_date: localDateIso(new Date()),
    range_end_date: localDateIso(new Date()),
    start_time: "08:00",
    end_time: "17:00",
    notes: "",
  });

  const [editingDispatchId, setEditingDispatchId] = useState<string | null>(null);
  const [editingDispatchValues, setEditingDispatchValues] = useState({
    dispatcher_profile_id: "",
    service_date: "",
    start_time: "",
    end_time: "",
    notes: "",
  });
  const [isSavingDispatchShift, setIsSavingDispatchShift] = useState(false);
  const [copyAvailabilityFromWeekStart, setCopyAvailabilityFromWeekStart] = useState("");
  const [copyAvailabilityToWeekStart, setCopyAvailabilityToWeekStart] = useState("");
  const [isCopyingAvailabilityWeek, setIsCopyingAvailabilityWeek] = useState(false);
  const [copyFromWeekStart, setCopyFromWeekStart] = useState("");
  const [copyToWeekStart, setCopyToWeekStart] = useState("");
  const [isCopyingDispatchWeek, setIsCopyingDispatchWeek] = useState(false);

  const canManageDriverAvailability =
    currentRole === "admin" || currentRole === "dispatch";
  const canManageDispatchSchedule = currentRole === "admin";

  const todayIso = localDateIso(new Date());
  const todayWeekStartIso = localDateIso(startOfWeek(new Date()));

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
      } else if (profile.role === "dispatch" || profile.role === "admin") {
        setCurrentRole(profile.role as AppRole);
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
      const { data, error } = await supabase
        .from("drivers")
        .select("*")
        .in("approval_status", ["pending", "approved"])
        .order("full_name");

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const driverRows = (data ?? []) as Driver[];
      setDrivers(driverRows);

      if (currentRole === "dispatch" || currentRole === "admin") {
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
    if (!authChecked) return;

    async function loadDispatchers() {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, name, dispatch_email, role")
        .in("role", ["dispatch", "admin"])
        .order("role", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      const rows = (data ?? []) as DispatcherOption[];
      setDispatchers(rows);

      if (rows.length > 0) {
        setDispatchForm((prev) => ({
          ...prev,
          dispatcher_profile_id: prev.dispatcher_profile_id || rows[0].id,
        }));
      }
    }

    loadDispatchers();
  }, [authChecked]);

  useEffect(() => {
    if (!authChecked || !selectedDriverId) return;

    async function loadSlots() {
      const { data, error } = await supabase
        .from("availability_slots")
        .select("*")
        .eq("driver_id", selectedDriverId)
        .gte("service_date", todayIso)
        .order("service_date", { ascending: true })
        .order("availability_type", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSlots((data ?? []) as AvailabilitySlot[]);
    }

    loadSlots();
  }, [authChecked, selectedDriverId, todayIso]);

  useEffect(() => {
    if (!authChecked) return;

    async function loadDispatchSchedule() {
      const endDate =
        dispatchScheduleView === 1
          ? addDaysIso(new Date(), 6)
          : dispatchScheduleView === 2
          ? addDaysIso(new Date(), 13)
          : addDaysIso(new Date(), 365);

      const { data, error } = await supabase
        .from("dispatcher_schedule")
        .select("*")
        .gte("service_date", todayIso)
        .lte("service_date", endDate)
        .order("service_date", { ascending: true })
        .order("start_time", { ascending: true });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setDispatchSchedule((data ?? []) as DispatchScheduleItem[]);
    }

    loadDispatchSchedule();
  }, [authChecked, todayIso, dispatchScheduleView]);

  const selectedDriver = useMemo(
    () => drivers.find((driver) => driver.id === selectedDriverId) ?? null,
    [drivers, selectedDriverId]
  );

  const allDispatchScheduleWeeks = useMemo(
    () => groupItemsIntoWeeks(dispatchSchedule),
    [dispatchSchedule]
  );

  const visibleDispatchScheduleWeeks = useMemo(() => {
    if (dispatchScheduleView === "all") return allDispatchScheduleWeeks;
    return allDispatchScheduleWeeks.slice(0, dispatchScheduleView);
  }, [allDispatchScheduleWeeks, dispatchScheduleView]);

  const copyToWeekOptions = useMemo(() => {
    if (!copyFromWeekStart) return [] as string[];

    const fromDate = parseLocalDate(copyFromWeekStart);
    return Array.from({ length: 52 }, (_, index) =>
      localDateIso(addDays(fromDate, (index + 1) * 7))
    ).filter((iso) => iso >= todayWeekStartIso);
  }, [copyFromWeekStart, todayWeekStartIso]);

  useEffect(() => {
    if (allDispatchScheduleWeeks.length === 0) {
      setCopyFromWeekStart("");
      setCopyToWeekStart("");
      return;
    }

    const availableStarts = allDispatchScheduleWeeks.map((week) => week.weekStartIso);
    const nextFrom =
      copyFromWeekStart && availableStarts.includes(copyFromWeekStart)
        ? copyFromWeekStart
        : availableStarts[0];

    const nextTo = localDateIso(addDays(parseLocalDate(nextFrom), 7));

    setCopyFromWeekStart(nextFrom);
    setCopyToWeekStart((current) => {
      if (current && current > nextFrom) return current;
      return nextTo;
    });
  }, [allDispatchScheduleWeeks, copyFromWeekStart]);

  const allAvailabilityWeeks = useMemo(
    () => groupItemsIntoWeeks(slots),
    [slots]
  );

  const copyAvailabilityToWeekOptions = useMemo(() => {
    if (!copyAvailabilityFromWeekStart) return [] as string[];

    const fromDate = parseLocalDate(copyAvailabilityFromWeekStart);
    return Array.from({ length: 52 }, (_, index) =>
      localDateIso(addDays(fromDate, (index + 1) * 7))
    ).filter((iso) => iso >= todayWeekStartIso);
  }, [copyAvailabilityFromWeekStart, todayWeekStartIso]);

  useEffect(() => {
    if (!selectedDriverId || allAvailabilityWeeks.length === 0) {
      setCopyAvailabilityFromWeekStart("");
      setCopyAvailabilityToWeekStart("");
      return;
    }

    const availableStarts = allAvailabilityWeeks.map((week) => week.weekStartIso);
    const nextFrom =
      copyAvailabilityFromWeekStart && availableStarts.includes(copyAvailabilityFromWeekStart)
        ? copyAvailabilityFromWeekStart
        : availableStarts[0];

    const nextTo = localDateIso(addDays(parseLocalDate(nextFrom), 7));

    setCopyAvailabilityFromWeekStart(nextFrom);
    setCopyAvailabilityToWeekStart((current) => {
      if (current && current > nextFrom) return current;
      return nextTo;
    });
  }, [allAvailabilityWeeks, selectedDriverId, copyAvailabilityFromWeekStart]);

  const visibleAvailabilityWeeks = useMemo(() => {
    if (existingAvailabilityView === "all") return allAvailabilityWeeks;
    return allAvailabilityWeeks.slice(0, existingAvailabilityView);
  }, [allAvailabilityWeeks, existingAvailabilityView]);

  function getDispatcherOption(profileId: string) {
    return dispatchers.find((d) => d.id === profileId) ?? null;
  }

  function getDispatcherDisplayName(option: DispatcherOption | null) {
    if (!option) return "Unknown";
    return option.name?.trim() || option.dispatch_email || "Unknown";
  }

  async function refreshAllData(driverId: string) {
    const dispatchEndDate =
      dispatchScheduleView === 1
        ? addDaysIso(new Date(), 6)
        : dispatchScheduleView === 2
        ? addDaysIso(new Date(), 13)
        : addDaysIso(new Date(), 365);

    const [
      { data: slotData, error: slotError },
      { data: dispatchData, error: dispatchError },
    ] = await Promise.all([
      supabase
        .from("availability_slots")
        .select("*")
        .eq("driver_id", driverId)
        .gte("service_date", todayIso)
        .order("service_date", { ascending: true })
        .order("availability_type", { ascending: true })
        .order("start_time", { ascending: true }),
      supabase
        .from("dispatcher_schedule")
        .select("*")
        .gte("service_date", todayIso)
        .lte("service_date", dispatchEndDate)
        .order("service_date", { ascending: true })
        .order("start_time", { ascending: true }),
    ]);

    if (slotError) {
      setErrorMessage(slotError.message);
      return;
    }

    if (dispatchError) {
      setErrorMessage(dispatchError.message);
      return;
    }

    setSlots((slotData ?? []) as AvailabilitySlot[]);
    setDispatchSchedule((dispatchData ?? []) as DispatchScheduleItem[]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedDriverId) {
      setErrorMessage("Please select a driver.");
      return;
    }

    if (
      currentRole === "driver" &&
      currentProfileDriverId &&
      selectedDriverId !== currentProfileDriverId
    ) {
      setErrorMessage("You can only submit availability for your own driver record.");
      return;
    }

    if ((availabilityType === "available" || (availabilityType === "unavailable" && !allDayUnavailable)) && endTime <= startTime) {
      setErrorMessage("End time must be later than start time.");
      return;
    }

    if (dateMode === "range" && rangeEndDate < rangeStartDate) {
      setErrorMessage("End date must be the same as or after start date.");
      return;
    }

    const selectedDates =
      dateMode === "single" ? [serviceDate] : getDateRange(rangeStartDate, rangeEndDate);

    setIsSaving(true);

    const { error } = await supabase.from("availability_slots").insert(
      selectedDates.map((date) => ({
        driver_id: selectedDriverId,
        service_date: date,
        start_time: availabilityType === "unavailable" && allDayUnavailable ? "00:00" : startTime,
        end_time: availabilityType === "unavailable" && allDayUnavailable ? "00:00" : endTime,
        availability_type: availabilityType,
      }))
    );

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setAvailabilityType("available");
    setSuccessMessage(
      `${availabilityType === "unavailable" ? "Unavailable" : "Availability"} saved for ${
        selectedDates.length
      } date${selectedDates.length === 1 ? "" : "s"}.`
    );
    await refreshAllData(selectedDriverId);
  }

  async function handleDelete(slotId: string) {
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase.from("availability_slots").delete().eq("id", slotId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Availability removed.");
    await refreshAllData(selectedDriverId);
  }

  async function handleCopyAvailabilityWeekForward() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!selectedDriverId) {
      setErrorMessage("Please select a driver first.");
      return;
    }

    if (!copyAvailabilityFromWeekStart || !copyAvailabilityToWeekStart) {
      setErrorMessage("Please choose both source and destination weeks.");
      return;
    }

    if (copyAvailabilityToWeekStart <= copyAvailabilityFromWeekStart) {
      setErrorMessage("Destination week must be after the source week.");
      return;
    }

    const sourceWeek = allAvailabilityWeeks.find(
      (week) => week.weekStartIso === copyAvailabilityFromWeekStart
    );

    if (!sourceWeek) {
      setErrorMessage("Source week is not available in existing availability.");
      return;
    }

    const sourceItems = sourceWeek.days.flatMap((day) => day.items);

    if (sourceItems.length === 0) {
      setErrorMessage("Source week has no availability slots to copy.");
      return;
    }

    const confirmed = window.confirm(
      `Copy ${sourceItems.length} availability slot${sourceItems.length === 1 ? "" : "s"} from ${formatWeekRangeLabel(
        copyAvailabilityFromWeekStart
      )} to ${formatWeekRangeLabel(copyAvailabilityToWeekStart)}?`
    );

    if (!confirmed) return;

    setIsCopyingAvailabilityWeek(true);

    const { error } = await supabase.from("availability_slots").insert(
      sourceItems.map((item) => {
        const sourceDayIndex = sourceWeek.days.findIndex((day) => day.iso === item.service_date);
        const targetServiceDate = localDateIso(
          addDays(parseLocalDate(copyAvailabilityToWeekStart), sourceDayIndex >= 0 ? sourceDayIndex : 0)
        );

        return {
          driver_id: selectedDriverId,
          service_date: targetServiceDate,
          start_time: item.start_time,
          end_time: item.end_time,
          availability_type: item.availability_type,
        };
      })
    );

    setIsCopyingAvailabilityWeek(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Availability week copied forward.");
    await refreshAllData(selectedDriverId);
  }

  async function handleAddDispatchShift(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const selectedDispatcher = getDispatcherOption(dispatchForm.dispatcher_profile_id);

    if (!selectedDispatcher) {
      setErrorMessage("Please select a dispatcher.");
      return;
    }

    if (dispatchForm.end_time <= dispatchForm.start_time) {
      setErrorMessage("Dispatch shift end time must be later than start time.");
      return;
    }

    if (
      dispatchForm.date_mode === "range" &&
      dispatchForm.range_end_date < dispatchForm.range_start_date
    ) {
      setErrorMessage("End date must be the same as or after start date.");
      return;
    }

    const selectedDates =
      dispatchForm.date_mode === "single"
        ? [dispatchForm.service_date]
        : getDateRange(dispatchForm.range_start_date, dispatchForm.range_end_date);

    setIsSavingDispatchShift(true);

    const { error } = await supabase.from("dispatcher_schedule").insert(
      selectedDates.map((date) => ({
        dispatcher_name: getDispatcherDisplayName(selectedDispatcher),
        dispatcher_email: selectedDispatcher.dispatch_email ?? null,
        service_date: date,
        start_time: dispatchForm.start_time,
        end_time: dispatchForm.end_time,
        notes: dispatchForm.notes.trim() || null,
      }))
    );

    setIsSavingDispatchShift(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setDispatchForm({
      dispatcher_profile_id: dispatchers[0]?.id ?? "",
      date_mode: "single",
      service_date: localDateIso(new Date()),
      range_start_date: localDateIso(new Date()),
      range_end_date: localDateIso(new Date()),
      start_time: "08:00",
      end_time: "17:00",
      notes: "",
    });
    setIsAddingDispatchShift(false);
    setSuccessMessage(
      `Dispatch shift saved for ${selectedDates.length} date${
        selectedDates.length === 1 ? "" : "s"
      }.`
    );
    await refreshAllData(selectedDriverId);
  }

  function beginEditDispatchShift(item: DispatchScheduleItem) {
    const matchingDispatcher =
      dispatchers.find((d) => (d.dispatch_email ?? "") === (item.dispatcher_email ?? "")) ?? null;

    setEditingDispatchId(item.id);
    setEditingDispatchValues({
      dispatcher_profile_id: matchingDispatcher?.id ?? "",
      service_date: item.service_date,
      start_time: item.start_time,
      end_time: item.end_time,
      notes: item.notes ?? "",
    });
    setErrorMessage(null);
    setSuccessMessage(null);
  }

  function cancelEditDispatchShift() {
    setEditingDispatchId(null);
    setEditingDispatchValues({
      dispatcher_profile_id: "",
      service_date: "",
      start_time: "",
      end_time: "",
      notes: "",
    });
  }

  async function handleUpdateDispatchShift(shiftId: string) {
    setErrorMessage(null);
    setSuccessMessage(null);

    const selectedDispatcher = getDispatcherOption(editingDispatchValues.dispatcher_profile_id);

    if (!selectedDispatcher) {
      setErrorMessage("Please select a dispatcher.");
      return;
    }

    if (editingDispatchValues.end_time <= editingDispatchValues.start_time) {
      setErrorMessage("Dispatch shift end time must be later than start time.");
      return;
    }

    setIsSavingDispatchShift(true);

    const { error } = await supabase
      .from("dispatcher_schedule")
      .update({
        dispatcher_name: getDispatcherDisplayName(selectedDispatcher),
        dispatcher_email: selectedDispatcher.dispatch_email ?? null,
        service_date: editingDispatchValues.service_date,
        start_time: editingDispatchValues.start_time,
        end_time: editingDispatchValues.end_time,
        notes: editingDispatchValues.notes.trim() || null,
      })
      .eq("id", shiftId);

    setIsSavingDispatchShift(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    cancelEditDispatchShift();
    setSuccessMessage("Dispatch shift updated.");
    await refreshAllData(selectedDriverId);
  }

  async function handleDeleteDispatchShift(shiftId: string) {
    setErrorMessage(null);
    setSuccessMessage(null);

    const { error } = await supabase
      .from("dispatcher_schedule")
      .delete()
      .eq("id", shiftId);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setSuccessMessage("Dispatch shift removed.");
    await refreshAllData(selectedDriverId);
  }

  async function handleCopyDispatchWeekForward() {
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!copyFromWeekStart || !copyToWeekStart) {
      setErrorMessage("Please choose both source and destination weeks.");
      return;
    }

    if (copyToWeekStart <= copyFromWeekStart) {
      setErrorMessage("Destination week must be after the source week.");
      return;
    }

    const sourceWeek = allDispatchScheduleWeeks.find(
      (week) => week.weekStartIso === copyFromWeekStart
    );

    if (!sourceWeek) {
      setErrorMessage("Source week is not available in the current schedule view.");
      return;
    }

    const sourceItems = sourceWeek.days.flatMap((day) => day.items);

    if (sourceItems.length === 0) {
      setErrorMessage("Source week has no dispatch shifts to copy.");
      return;
    }

    const confirmed = window.confirm(
      `Copy ${sourceItems.length} dispatch shift${sourceItems.length === 1 ? "" : "s"} from ${formatWeekRangeLabel(
        copyFromWeekStart
      )} to ${formatWeekRangeLabel(copyToWeekStart)}?`
    );

    if (!confirmed) return;

    setIsCopyingDispatchWeek(true);

    const { error } = await supabase.from("dispatcher_schedule").insert(
      sourceItems.map((item) => {
        const sourceDayIndex = sourceWeek.days.findIndex((day) => day.iso === item.service_date);
        const targetServiceDate = localDateIso(
          addDays(parseLocalDate(copyToWeekStart), sourceDayIndex >= 0 ? sourceDayIndex : 0)
        );

        return {
          dispatcher_name: item.dispatcher_name,
          dispatcher_email: item.dispatcher_email,
          service_date: targetServiceDate,
          start_time: item.start_time,
          end_time: item.end_time,
          notes: item.notes,
        };
      })
    );

    setIsCopyingDispatchWeek(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    const dispatchEndDate =
      dispatchScheduleView === 1
        ? addDaysIso(new Date(), 6)
        : dispatchScheduleView === 2
        ? addDaysIso(new Date(), 13)
        : addDaysIso(new Date(), 365);

    const { data: refreshedDispatchData, error: refreshError } = await supabase
      .from("dispatcher_schedule")
      .select("*")
      .gte("service_date", todayIso)
      .lte("service_date", dispatchEndDate)
      .order("service_date", { ascending: true })
      .order("start_time", { ascending: true });

    if (refreshError) {
      setErrorMessage(refreshError.message);
      return;
    }

    setDispatchSchedule((refreshedDispatchData ?? []) as DispatchScheduleItem[]);
    setSuccessMessage("Dispatch week copied forward.");
  }

  if (!authChecked) {
    return (
      <div className="p-6 text-sm text-zinc-600 dark:text-zinc-300 sm:p-10">
        Checking access...
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-7xl p-4 text-zinc-900 dark:text-zinc-100 sm:p-6 lg:p-8">
      <h1 className="mb-2 text-xl font-semibold sm:text-2xl">
        Accell Contractor Availability Submission
      </h1>
      <p className="mb-6 text-sm text-zinc-600 dark:text-zinc-300">
        Drivers can submit one or more availability windows per day. Dispatch can use this same
        page for quick updates.
      </p>

      <div className="mb-6 flex flex-wrap gap-2">
        {(currentRole === "admin" || currentRole === "dispatch") && (
          <button
            type="button"
            onClick={() => router.push("/weekly")}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Dispatcher Page
          </button>
        )}
        <button
          type="button"
          onClick={() => router.push("/availability")}
          className="rounded bg-blue-700 px-4 py-2 text-sm font-medium text-white"
        >
          Availability
        </button>
      </div>

      {errorMessage && (
        <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {errorMessage}
        </div>
      )}

      {successMessage && (
        <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-800 dark:bg-green-950 dark:text-green-200">
          {successMessage}
        </div>
      )}

      <section className="mb-6 rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
        <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-medium">Dispatch Schedule</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-300">
              {dispatchScheduleView === 1
                ? "Showing current week first"
                : dispatchScheduleView === 2
                ? "Showing current and next week"
                : "Showing all future weeks starting with the current week"}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <WeekViewButtons value={dispatchScheduleView} onChange={setDispatchScheduleView} />
            {canManageDispatchSchedule && (
              <button
                type="button"
                onClick={() => {
                  setIsAddingDispatchShift((prev) => !prev);
                  cancelEditDispatchShift();
                }}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                {isAddingDispatchShift ? "Close" : "Add Shift"}
              </button>
            )}
          </div>
        </div>

        {canManageDispatchSchedule && isAddingDispatchShift && (
          <form
            onSubmit={handleAddDispatchShift}
            className="mb-4 rounded-lg border border-blue-300 bg-blue-50 p-4 shadow-sm dark:border-blue-900 dark:bg-blue-950/60"
          >
            <div className="mb-3 text-sm font-semibold text-blue-900 dark:text-blue-100">
              Add Dispatch Shift
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">Dispatcher</label>
                <select
                  value={dispatchForm.dispatcher_profile_id}
                  onChange={(e) =>
                    setDispatchForm((prev) => ({
                      ...prev,
                      dispatcher_profile_id: e.target.value,
                    }))
                  }
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {dispatchers.map((dispatcher) => (
                    <option key={dispatcher.id} value={dispatcher.id}>
                      {getDispatcherDisplayName(dispatcher)}
                      {dispatcher.role === "admin" ? " (Admin)" : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Date mode</label>
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="dispatchDateMode"
                      value="single"
                      checked={dispatchForm.date_mode === "single"}
                      onChange={() =>
                        setDispatchForm((prev) => ({
                          ...prev,
                          date_mode: "single",
                        }))
                      }
                      className="h-4 w-4"
                    />
                    Single date
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name="dispatchDateMode"
                      value="range"
                      checked={dispatchForm.date_mode === "range"}
                      onChange={() =>
                        setDispatchForm((prev) => ({
                          ...prev,
                          date_mode: "range",
                        }))
                      }
                      className="h-4 w-4"
                    />
                    Date range
                  </label>
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">Notes</label>
                <input
                  type="text"
                  value={dispatchForm.notes}
                  onChange={(e) =>
                    setDispatchForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              {dispatchForm.date_mode === "single" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">Date</label>
                  <input
                    type="date"
                    value={dispatchForm.service_date}
                    onChange={(e) =>
                      setDispatchForm((prev) => ({ ...prev, service_date: e.target.value }))
                    }
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>
              ) : (
                <>
                  <div>
                    <label className="mb-1 block text-sm font-medium">Start date</label>
                    <input
                      type="date"
                      value={dispatchForm.range_start_date}
                      onChange={(e) =>
                        setDispatchForm((prev) => ({
                          ...prev,
                          range_start_date: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">End date</label>
                    <input
                      type="date"
                      value={dispatchForm.range_end_date}
                      onChange={(e) =>
                        setDispatchForm((prev) => ({
                          ...prev,
                          range_end_date: e.target.value,
                        }))
                      }
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium">Start time</label>
                <input
                  type="time"
                  value={dispatchForm.start_time}
                  onChange={(e) =>
                    setDispatchForm((prev) => ({ ...prev, start_time: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">End time</label>
                <input
                  type="time"
                  value={dispatchForm.end_time}
                  onChange={(e) =>
                    setDispatchForm((prev) => ({ ...prev, end_time: e.target.value }))
                  }
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <button
                type="submit"
                disabled={isSavingDispatchShift}
                className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingDispatchShift ? "Saving..." : "Save Shift"}
              </button>
              <button
                type="button"
                onClick={() => setIsAddingDispatchShift(false)}
                className="rounded border border-zinc-300 px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        {canManageDispatchSchedule && allDispatchScheduleWeeks.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-900 dark:bg-amber-950/40">
            <div className="mb-2 text-sm font-semibold text-amber-900 dark:text-amber-100">
              Copy Week Forward
            </div>
            <p className="mb-3 text-xs text-amber-800 dark:text-amber-200">
              Copy all dispatch shifts from one week into a future week.
            </p>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm font-medium">From week</label>
                <select
                  value={copyFromWeekStart}
                  onChange={(e) => setCopyFromWeekStart(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {allDispatchScheduleWeeks.map((week) => (
                    <option key={week.weekStartIso} value={week.weekStartIso}>
                      {formatWeekRangeLabel(week.weekStartIso)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium">To week</label>
                <select
                  value={copyToWeekStart}
                  onChange={(e) => setCopyToWeekStart(e.target.value)}
                  className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                >
                  {copyToWeekOptions.map((weekStartIso) => (
                    <option key={weekStartIso} value={weekStartIso}>
                      {formatWeekRangeLabel(weekStartIso)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={handleCopyDispatchWeekForward}
                  disabled={isCopyingDispatchWeek || !copyFromWeekStart || !copyToWeekStart}
                  className="w-full rounded bg-amber-600 px-3 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {isCopyingDispatchWeek ? "Copying..." : "Copy Forward"}
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-4">
          {visibleDispatchScheduleWeeks.map((week) => (
            <div
              key={week.weekStartIso}
              className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950"
            >
              <div className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                {formatWeekRangeLabel(week.weekStartIso)}
              </div>

              <div className="-mx-2 overflow-x-auto px-2 pb-2 sm:mx-0 sm:px-0">
                <div className="grid min-w-[860px] snap-x snap-mandatory grid-cols-7 gap-3 sm:min-w-[1120px]">
                  {week.days.map((day) => {
                    const isToday = day.iso === todayIso;

                    return (
                      <div
                        key={day.iso}
                        className={`snap-start rounded border p-2 ${
                          isToday
                            ? "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
                            : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                        }`}
                      >
                        <div
                          className={`mb-2 border-b pb-2 text-center ${
                            isToday
                              ? "border-blue-200 dark:border-blue-900"
                              : "border-zinc-200 dark:border-zinc-800"
                          }`}
                        >
                          <div className="text-xs font-semibold">{day.labelTop}</div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {day.labelBottom}
                          </div>
                        </div>

                        <div className="space-y-2">
                          {day.items.length === 0 ? (
                            <div className="rounded border border-dashed border-zinc-300 p-2 text-center text-xs text-zinc-400 dark:border-zinc-700">
                              —
                            </div>
                          ) : (
                            day.items.map((item) =>
                              editingDispatchId === item.id ? (
                                <div
                                  key={item.id}
                                  className="rounded border border-blue-200 bg-blue-50 p-2 dark:border-blue-900 dark:bg-blue-950"
                                >
                                  <div className="space-y-2">
                                    <select
                                      value={editingDispatchValues.dispatcher_profile_id}
                                      onChange={(e) =>
                                        setEditingDispatchValues((prev) => ({
                                          ...prev,
                                          dispatcher_profile_id: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                    >
                                      {dispatchers.map((dispatcher) => (
                                        <option key={dispatcher.id} value={dispatcher.id}>
                                          {getDispatcherDisplayName(dispatcher)}
                                          {dispatcher.role === "admin" ? " (Admin)" : ""}
                                        </option>
                                      ))}
                                    </select>

                                    <input
                                      type="date"
                                      value={editingDispatchValues.service_date}
                                      onChange={(e) =>
                                        setEditingDispatchValues((prev) => ({
                                          ...prev,
                                          service_date: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                    />

                                    <div className="grid grid-cols-2 gap-2">
                                      <input
                                        type="time"
                                        value={editingDispatchValues.start_time}
                                        onChange={(e) =>
                                          setEditingDispatchValues((prev) => ({
                                            ...prev,
                                            start_time: e.target.value,
                                          }))
                                        }
                                        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                      />
                                      <input
                                        type="time"
                                        value={editingDispatchValues.end_time}
                                        onChange={(e) =>
                                          setEditingDispatchValues((prev) => ({
                                            ...prev,
                                            end_time: e.target.value,
                                          }))
                                        }
                                        className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                      />
                                    </div>

                                    <input
                                      type="text"
                                      value={editingDispatchValues.notes}
                                      onChange={(e) =>
                                        setEditingDispatchValues((prev) => ({
                                          ...prev,
                                          notes: e.target.value,
                                        }))
                                      }
                                      className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                                      placeholder="Notes"
                                    />

                                    <div className="flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateDispatchShift(item.id)}
                                        disabled={isSavingDispatchShift}
                                        className="rounded bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                        title="Save"
                                      >
                                        S
                                      </button>
                                      <button
                                        type="button"
                                        onClick={cancelEditDispatchShift}
                                        className="rounded border border-zinc-300 px-2 py-1 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                                        title="Cancel"
                                      >
                                        C
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <div
                                  key={item.id}
                                  className="rounded border border-zinc-200 bg-zinc-50 p-2 text-xs dark:border-zinc-800 dark:bg-zinc-950"
                                >
                                  <div className="font-medium">
                                    {formatTime(item.start_time)} - {formatTime(item.end_time)}
                                  </div>
                                  <div className="truncate text-zinc-700 dark:text-zinc-300">
                                    {item.dispatcher_name}
                                  </div>
                                  {item.notes && (
                                    <div className="truncate text-zinc-500 dark:text-zinc-400">
                                      {item.notes}
                                    </div>
                                  )}

                                  {canManageDispatchSchedule && (
                                    <div className="mt-2 flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => beginEditDispatchShift(item)}
                                        className="rounded bg-blue-600 px-2 py-1 text-[11px] font-medium text-white hover:bg-blue-700"
                                        title="Edit"
                                      >
                                        E
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteDispatchShift(item.id)}
                                        className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900"
                                        title="Delete"
                                      >
                                        D
                                      </button>
                                    </div>
                                  )}
                                </div>
                              )
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-6 2xl:grid-cols-[420px,1fr]">
        <section className="rounded-xl border border-blue-300 bg-blue-50 p-4 shadow-md dark:border-blue-900 dark:bg-blue-950/40 sm:p-5">
          <div className="mb-4">
            <h2 className="text-lg font-semibold text-blue-900 dark:text-blue-100">
              Add Driver Availability
            </h2>
            <p className="text-sm text-blue-800 dark:text-blue-200">
              Primary action area for driver schedule entry.
            </p>
          </div>

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-4 rounded-xl border border-blue-200/70 bg-white/80 p-4 shadow-sm dark:border-blue-900/70 dark:bg-zinc-900/80">
              {canManageDriverAvailability && (
                <div>
                  <label className="mb-1 block text-sm font-medium">Driver</label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-3 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 sm:py-2"
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
                <div className="rounded border border-blue-200 bg-white p-3 text-sm dark:border-blue-900 dark:bg-zinc-900">
                  <div className="font-medium">{selectedDriver.full_name}</div>
                  <div className="text-zinc-600 dark:text-zinc-400">
                    {selectedDriver.vehicle_label ? selectedDriver.vehicle_label : "No vehicle"}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 lg:items-end">
                <div>
                  <label className="mb-1 block text-sm font-medium">Availability type</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="availabilityType"
                        value="available"
                        checked={availabilityType === "available"}
                        onChange={() => setAvailabilityType("available")}
                        className="h-4 w-4"
                      />
                      Available
                    </label>
                    <label className="flex items-center gap-2 text-sm text-red-700 dark:text-red-300">
                      <input
                        type="radio"
                        name="availabilityType"
                        value="unavailable"
                        checked={availabilityType === "unavailable"}
                        onChange={() => setAvailabilityType("unavailable")}
                        className="h-4 w-4"
                      />
                      Unavailable
                    </label>
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-sm font-medium">Date mode</label>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
                    <label className="flex items-center gap-2 text-sm">
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
                    <label className="flex items-center gap-2 text-sm">
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

              </div>

              {dateMode === "single" ? (
                <div>
                  <label className="mb-1 block text-sm font-medium">Date</label>
                  <input
                    type="date"
                    value={serviceDate}
                    onChange={(e) => setServiceDate(e.target.value)}
                    className="w-full rounded border border-zinc-300 bg-white px-3 py-3 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 sm:py-2"
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Start date</label>
                    <input
                      type="date"
                      value={rangeStartDate}
                      onChange={(e) => setRangeStartDate(e.target.value)}
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-3 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 sm:py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">End date</label>
                    <input
                      type="date"
                      value={rangeEndDate}
                      onChange={(e) => setRangeEndDate(e.target.value)}
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-3 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 sm:py-2"
                    />
                  </div>
                </div>
              )}

              {availabilityType === "unavailable" && (
                <div>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={allDayUnavailable}
                      onChange={(e) => setAllDayUnavailable(e.target.checked)}
                      className="h-4 w-4"
                    />
                    All day (no specific time window)
                  </label>
                </div>
              )}

              {(availabilityType === "available" || (availabilityType === "unavailable" && !allDayUnavailable)) ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-medium">Start time</label>
                    <input
                      type="time"
                      value={startTime}
                      onChange={(e) => setStartTime(e.target.value)}
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-3 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 sm:py-2"
                    />
                  </div>

                  <div>
                    <label className="mb-1 block text-sm font-medium">End time</label>
                    <input
                      type="time"
                      value={endTime}
                      onChange={(e) => setEndTime(e.target.value)}
                      className="w-full rounded border border-zinc-300 bg-white px-3 py-3 text-zinc-900 shadow-sm dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100 sm:py-2"
                    />
                  </div>
                </div>
              ) : (
                <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-200">
                  This will save the selected date(s) as unavailable all day.
                </div>
              )}

              <button
                type="submit"
                disabled={isSaving}
                className={`w-full rounded px-4 py-3 text-white disabled:opacity-50 sm:w-auto sm:py-2 ${
                  availabilityType === "unavailable"
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSaving
                  ? "Saving..."
                  : availabilityType === "unavailable"
                  ? "Save unavailable"
                  : "Save availability"}
              </button>

              <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 dark:border-amber-900 dark:bg-amber-950/40">
                <div className="mb-1 text-xs font-semibold text-amber-900 dark:text-amber-100">
                  Copy week forward
                </div>
                {selectedDriverId && allAvailabilityWeeks.length > 0 ? (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr,1fr,auto] sm:items-end">
                    <select
                      value={copyAvailabilityFromWeekStart}
                      onChange={(e) => setCopyAvailabilityFromWeekStart(e.target.value)}
                      className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                      {allAvailabilityWeeks.map((week) => (
                        <option key={week.weekStartIso} value={week.weekStartIso}>
                          {formatWeekRangeLabel(week.weekStartIso)}
                        </option>
                      ))}
                    </select>

                    <select
                      value={copyAvailabilityToWeekStart}
                      onChange={(e) => setCopyAvailabilityToWeekStart(e.target.value)}
                      className="w-full rounded border border-zinc-300 bg-white px-2 py-1 text-xs text-zinc-900 dark:border-zinc-700 dark:bg-zinc-950 dark:text-zinc-100"
                    >
                      {copyAvailabilityToWeekOptions.map((weekStartIso) => (
                        <option key={weekStartIso} value={weekStartIso}>
                          {formatWeekRangeLabel(weekStartIso)}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={handleCopyAvailabilityWeekForward}
                      disabled={
                        isCopyingAvailabilityWeek ||
                        !copyAvailabilityFromWeekStart ||
                        !copyAvailabilityToWeekStart
                      }
                      className="rounded bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                    >
                      {isCopyingAvailabilityWeek ? "Copying..." : "Copy"}
                    </button>
                  </div>
                ) : (
                  <div className="text-xs text-amber-800 dark:text-amber-200">
                    No existing weeks to copy.
                  </div>
                )}
              </div>
            </div>
          </form>
        </section>

        <section className="overflow-hidden rounded-xl border border-zinc-200 bg-white p-4 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 sm:p-5">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-medium">Existing Availability</h2>
              {selectedDriver && (
                <p className="text-sm text-zinc-600 dark:text-zinc-400">
                  {selectedDriver.full_name}
                  {selectedDriver.vehicle_label ? ` — ${selectedDriver.vehicle_label}` : ""}
                </p>
              )}
            </div>

            <WeekViewButtons
              value={existingAvailabilityView}
              onChange={setExistingAvailabilityView}
            />
          </div>

          <p className="mb-4 text-sm text-zinc-600 dark:text-zinc-300">
            {existingAvailabilityView === 1
              ? "Showing the current week first"
              : existingAvailabilityView === 2
              ? "Showing the current two weeks first"
              : "Showing all future availability weeks starting with the current week"}
          </p>

          {slots.length === 0 ? (
            <div className="rounded border border-dashed border-zinc-300 p-4 text-sm text-zinc-600 dark:border-zinc-700 dark:text-zinc-300">
              No current or future availability slots found.
            </div>
          ) : (
            <div className="space-y-4">
              {visibleAvailabilityWeeks.map((week) => (
                <div
                  key={week.weekStartIso}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950"
                >
                  <div className="mb-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200">
                    {formatWeekRangeLabel(week.weekStartIso)}
                  </div>

                  <div className="-mx-2 overflow-x-auto px-2 pb-2 sm:mx-0 sm:px-0">
                    <div className="grid min-w-[860px] snap-x snap-mandatory grid-cols-7 gap-3 sm:min-w-[1120px]">
                      {week.days.map((day) => {
                        const isToday = day.iso === todayIso;

                        return (
                          <div
                            key={day.iso}
                            className={`snap-start rounded border p-2 ${
                              isToday
                                ? "border-blue-300 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/40"
                                : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900"
                            }`}
                          >
                            <div
                              className={`mb-2 border-b pb-2 text-center ${
                                isToday
                                  ? "border-blue-200 dark:border-blue-900"
                                  : "border-zinc-200 dark:border-zinc-800"
                              }`}
                            >
                              <div className="text-xs font-semibold">{day.labelTop}</div>
                              <div className="text-xs text-zinc-500 dark:text-zinc-400">
                                {day.labelBottom}
                              </div>
                            </div>

                            <div className="space-y-2">
                              {day.items.length === 0 ? (
                                <div className="rounded border border-dashed border-zinc-300 p-2 text-center text-xs text-zinc-400 dark:border-zinc-700">
                                  —
                                </div>
                              ) : (
                                day.items.map((slot) => (
                                  <div
                                    key={slot.id}
                                    className={`rounded border p-2 text-xs ${
                                      slot.availability_type === "unavailable"
                                        ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/40"
                                        : "border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-950"
                                    }`}
                                  >
                                    <div
                                      className={`font-medium ${
                                        slot.availability_type === "unavailable"
                                          ? "text-red-700 dark:text-red-300"
                                          : ""
                                      }`}
                                    >
                                      {slot.availability_type === "unavailable"
                                        ? slot.start_time === "00:00" && slot.end_time === "00:00"
                                          ? "Unavailable (all day)"
                                          : `Unavailable ${formatTime(slot.start_time)} - ${formatTime(slot.end_time)}`
                                        : `${formatTime(slot.start_time)} - ${formatTime(
                                            slot.end_time
                                          )}`}
                                    </div>

                                    <div className="mt-2 flex gap-1">
                                      <button
                                        type="button"
                                        onClick={() => handleDelete(slot.id)}
                                        className="rounded border border-red-300 bg-red-50 px-2 py-1 text-[11px] font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950 dark:text-red-200 dark:hover:bg-red-900"
                                        title="Delete"
                                      >
                                        D
                                      </button>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}