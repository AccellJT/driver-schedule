"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { updateLastLogin } from "@/lib/availabilityAudit";

export default function DriverAuthPage() {
  const router = useRouter();
  const [message, setMessage] = useState("Signing you in...");

  useEffect(() => {
    async function finishDriverLogin() {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user?.email) {
        router.replace("/driver-login");
        return;
      }

      // Load or create profile row
      let { data: profile } = await supabase
        .from("profiles")
        .select("id, role, driver_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile) {
        const { error: insertProfileError } = await supabase
          .from("profiles")
          .insert({
            id: user.id,
            role: "driver",
          });

        if (insertProfileError) {
          setMessage(insertProfileError.message);
          return;
        }

        const result = await supabase
          .from("profiles")
          .select("id, role, driver_id")
          .eq("id", user.id)
          .single();

        profile = result.data ?? null;
      }

      // Match driver by email, excluding blocked drivers
      const { data: driver, error: driverError } = await supabase
        .from("drivers")
        .select("id, approval_status")
        .ilike("email", user.email)
        .maybeSingle();

      if (driverError) {
        setMessage(driverError.message);
        return;
      }

      if (!driver) {
        setMessage("No driver record is linked to this email.");
        return;
      }

      if (driver.approval_status === "blocked") {
        await supabase.auth.signOut();
        setMessage("This driver account has been removed from schedule.");
        return;
      }

      const { error: updateProfileError } = await supabase
        .from("profiles")
        .update({
          role: "driver",
          driver_id: driver.id,
        })
        .eq("id", user.id);

      if (updateProfileError) {
        setMessage(updateProfileError.message);
        return;
      }

      await updateLastLogin(user.id);
      router.replace("/availability");
    }

    finishDriverLogin();
  }, [router]);

  return <div className="p-10 text-sm text-gray-500">{message}</div>;
}