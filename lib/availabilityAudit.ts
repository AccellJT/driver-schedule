import { supabase } from "@/lib/supabase";

export type AvailabilityAuditAction =
  | "availability.slot_added"
  | "availability.slot_updated"
  | "availability.slot_deleted"
  | "availability.week_copied"
  | "availability.request_update"
  | "availability.driver_readded";

export interface AvailabilityAuditEntry {
  id: string;
  created_at: string;
  actor_profile_id: string | null;
  actor_role: string | null;
  actor_name: string | null;
  target_driver_id: string | null;
  target_driver_name: string | null;
  action: AvailabilityAuditAction;
  details: string | null;
  source: string | null;
  event_metadata: Record<string, unknown> | null;
}

export async function recordAvailabilityActivity({
  action,
  details,
  targetDriverId = null,
  targetDriverName = null,
  source = null,
  eventMetadata = null,
}: {
  action: AvailabilityAuditAction;
  details: string;
  targetDriverId?: string | null;
  targetDriverName?: string | null;
  source?: string | null;
  eventMetadata?: Record<string, unknown> | null;
}) {
  const { data: authData, error: authError } = await supabase.auth.getUser();
  const authUserId = authData?.user?.id ?? null;
  let actorProfileId: string | null = null;
  let actorName: string | null = null;
  let actorRole: string | null = null;

  if (authError) {
    console.warn("Unable to read current auth user for audit log", authError.message);
  }

  if (authUserId) {
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id, name, role")
      .eq("id", authUserId)
      .single();

    if (!profileError && profile) {
      actorProfileId = profile.id;
      actorName = profile.name ?? null;
      actorRole = profile.role ?? null;
    } else if (profileError) {
      console.warn("Unable to resolve audit actor profile", profileError.message);
    }
  }

  const payload = {
    actor_profile_id: actorProfileId,
    actor_role: actorRole,
    actor_name: actorName,
    target_driver_id: targetDriverId,
    target_driver_name: targetDriverName,
    action,
    details,
    source,
    event_metadata: eventMetadata,
  };

  const result = await supabase.from("availability_activity_log").insert([payload]);

  if (result.error) {
    const errorPayload = {
      message: result.error.message,
      details: result.error.details,
      hint: result.error.hint,
      code: result.error.code,
    };

    const logPayload = {
      action,
      targetDriverId,
      targetDriverName,
      source,
      payload,
      error: errorPayload,
      rawResult: result,
    };

    console.error(
      "Unable to record availability activity: " +
        JSON.stringify(logPayload, null, 2)
    );
  }

  return result;
}

export async function updateLastLogin(profileId: string) {
  const { error } = await supabase
    .from("profiles")
    .update({ last_login_at: new Date().toISOString() })
    .eq("id", profileId);

  if (error) {
    console.warn("Unable to update last login:", error.message);
  }
}
