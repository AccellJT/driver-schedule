"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function DriverLoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setIsLoading(false);
      setErrorMessage(error.message);
      return;
    }

    const user = data.user;

    if (!user) {
      setIsLoading(false);
      setErrorMessage("Login failed.");
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, driver_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("No driver profile found for this account.");
      return;
    }

    if (profile.role !== "driver" || !profile.driver_id) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("This account is not authorized for driver access.");
      return;
    }

    const { data: driver, error: driverError } = await supabase
      .from("drivers")
      .select("approval_status")
      .eq("id", profile.driver_id)
      .single();

    if (driverError || !driver) {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("Unable to load driver record.");
      return;
    }

    if (driver.approval_status === "blocked") {
      await supabase.auth.signOut();
      setIsLoading(false);
      setErrorMessage("This driver account has been removed from schedule.");
      return;
    }

    setIsLoading(false);
    router.push("/availability");
    router.refresh();
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-black">Driver Login</h1>
        <p className="mb-6 text-sm text-gray-500">
          Sign in with your email and password.
        </p>

        {errorMessage && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
              required
            />
          </div>

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

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {isLoading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </main>
  );
}