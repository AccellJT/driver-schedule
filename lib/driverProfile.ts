import { supabase } from "@/lib/supabase";

export type DriverRecord = {
  id: string;
  full_name: string;
  email: string;
  approval_status: "pending" | "approved" | "blocked" | null;
};

export type ProfileRecord = {
  id: string;
  name: string | null;
  role: string | null;
  driver_id: string | null;
};

export function normalizePersonName(value: string): string {
  return value.replace(/[\s\u00A0]+/g, " ").trim();
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function isBlankName(value: string | null | undefined): boolean {
  return !value || normalizePersonName(value) === "";
}

export function getDriverDisplayName(driver: DriverRecord, emailFallback?: string): string {
  const normalized = normalizePersonName(driver.full_name);
  if (normalized) return normalized;
  if (emailFallback) return normalizeEmail(emailFallback);
  return "Driver";
}

export async function getDriverByEmail(email: string) {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return { data: null, error: new Error("Invalid email address.") };
  }

  const result = await supabase
    .from("drivers")
    .select("id, full_name, email, approval_status")
    .ilike("email", normalizedEmail)
    .maybeSingle();

  return {
    data: result.data as DriverRecord | null,
    error: result.error,
  };
}

export async function upsertDriverProfileForUser(userId: string, driver: DriverRecord) {
  const normalizedName = getDriverDisplayName(driver, driver.email ?? undefined);

  const { error } = await supabase.from("profiles").upsert(
    {
      id: userId,
      role: "driver",
      name: normalizedName,
      driver_id: driver.id,
    },
    { onConflict: "id" }
  );

  return { error };
}

export async function ensureDriverProfileForUser(userId: string, userEmail: string) {
  const { data: driver, error: driverError } = await getDriverByEmail(userEmail);

  if (driverError) {
    return { driver: null, error: driverError };
  }

  if (!driver) {
    return { driver: null, error: new Error("No driver record is linked to this email.") };
  }

  if (driver.approval_status === "blocked") {
    return { driver: null, error: new Error("This driver account has been removed from schedule.") };
  }

  const { error } = await upsertDriverProfileForUser(userId, driver);
  if (error) {
    return { driver: null, error };
  }

  return { driver, error: null };
}
