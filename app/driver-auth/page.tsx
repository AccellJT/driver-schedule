"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { updateLastLogin } from "@/lib/availabilityAudit";
import { ensureDriverProfileForUser } from "@/lib/driverProfile";

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

      const { error: profileError } = await ensureDriverProfileForUser(
        user.id,
        user.email
      );

      if (profileError) {
        await supabase.auth.signOut();
        setMessage(profileError.message);
        return;
      }

      await updateLastLogin(user.id);
      router.replace("/availability");
    }

    finishDriverLogin();
  }, [router]);

  return <div className="p-10 text-sm text-gray-500">{message}</div>;
}