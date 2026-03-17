"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/login";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    await supabase.auth.updateUser({ password });

    setMessage("Password updated!");

    setTimeout(() => {
      router.push(nextPath);
    }, 1500);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-xl border p-6 shadow">
        <h1 className="mb-4 text-2xl font-semibold">Reset Password</h1>

        {message && <div className="text-green-600">{message}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />

          <input
            type="password"
            placeholder="Confirm password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
          />

          <button className="w-full rounded bg-blue-600 py-2 text-white">
            Update Password
          </button>
        </form>
      </div>
    </main>
  );
}