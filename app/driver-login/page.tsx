"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
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

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password,
    });

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.push("/availability");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-xl border p-6 shadow">
        <h1 className="mb-4 text-2xl font-semibold">Driver Login</h1>

        {errorMessage && (
          <div className="mb-4 text-sm text-red-600">{errorMessage}</div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded border px-3 py-2"
            required
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded bg-blue-600 py-2 text-white"
          >
            {isLoading ? "Logging in..." : "Login"}
          </button>
        </form>

        {/* ✅ CRITICAL FIX */}
        <div className="mt-4 text-center">
          <Link href="/forgot-password?next=/driver-login" className="text-blue-600">
            Forgot password?
          </Link>
        </div>
      </div>
    </main>
  );
}