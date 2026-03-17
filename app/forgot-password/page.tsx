"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") || "/login";

  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setMessage(null);
    setErrorMessage(null);
    setIsLoading(true);

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        redirectTo: `${window.location.origin}/reset-password?next=${encodeURIComponent(nextPath)}`,
      }
    );

    setIsLoading(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("If that email exists, a password reset link has been sent.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-xl border p-6 shadow">
        <h1 className="mb-2 text-2xl font-semibold">Forgot Password</h1>

        {errorMessage && <div className="text-red-600">{errorMessage}</div>}
        {message && <div className="text-green-600">{message}</div>}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded border px-3 py-2"
            required
          />

          <button className="w-full rounded bg-blue-600 py-2 text-white">
            {isLoading ? "Sending..." : "Send reset link"}
          </button>
        </form>

        <div className="mt-4 text-center">
          <Link href={nextPath} className="text-blue-600">
            Back to login
          </Link>
        </div>
      </div>
    </main>
  );
}