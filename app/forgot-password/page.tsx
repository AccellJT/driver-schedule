"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    setIsSending(true);

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    });

    setIsSending(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Password reset email sent. Check your inbox.");
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-black">Reset password</h1>
        <p className="mb-6 text-sm text-gray-500">
          Enter the driver email and we’ll send a reset link.
        </p>

        {errorMessage && (
          <div className="mb-4 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        {message && (
          <div className="mb-4 rounded border border-green-300 bg-green-50 p-3 text-sm text-green-700">
            {message}
          </div>
        )}

        <form onSubmit={handleReset} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-black">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded border border-gray-300 bg-white px-3 py-2 text-gray-900"
              required
            />
          </div>

          <button
            type="submit"
            disabled={isSending}
            className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {isSending ? "Sending..." : "Send reset email"}
          </button>
        </form>
      </div>
    </main>
  );
}