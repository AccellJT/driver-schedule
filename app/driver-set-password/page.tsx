"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DriverSetPasswordPage() {
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("Preparing your account...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setIsReady(true);
        setMessage("Set your password to continue.");
      }
    });

    supabase.auth.getSession().then(() => {
      setIsReady(true);
      setMessage("Set your password to continue.");
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);

    if (!password || password.length < 8) {
      setErrorMessage("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMessage("Passwords do not match.");
      return;
    }

    setIsSaving(true);

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user?.email) {
      setIsSaving(false);
      setErrorMessage("Unable to identify this account.");
      return;
    }

    const { error: passwordError } = await supabase.auth.updateUser({
      password,
    });

    if (passwordError) {
      setIsSaving(false);
      setErrorMessage(passwordError.message);
      return;
    }

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("id, email, full_name, approval_status")
      .ilike("email", user.email)
      .maybeSingle();

    if (driverError) {
      setIsSaving(false);
      setErrorMessage(driverError.message);
      return;
    }

    if (!driver) {
      setIsSaving(false);
      setErrorMessage("No driver record matches this email.");
      return;
    }

    if (driver.approval_status === "blocked") {
      await supabase.auth.signOut();
      setIsSaving(false);
      setErrorMessage("This driver account has been removed from schedule.");
      return;
    }

    const { error: profileUpsertError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: user.id,
          role: "driver",
          name: driver.full_name,
          driver_id: driver.id,
        },
        { onConflict: "id" }
      );

    if (profileUpsertError) {
      setIsSaving(false);
      setErrorMessage(profileUpsertError.message);
      return;
    }

    setIsSaving(false);
    router.replace("/availability");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-black">
          Create your password
        </h1>
        <p className="mb-6 text-sm text-gray-500">{message}</p>

        {errorMessage && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {!isReady ? (
          <div className="text-sm text-gray-500">Preparing reset session...</div>
        ) : (
          <form onSubmit={handleSetPassword} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
                required
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-black">
                Confirm password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Set password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}