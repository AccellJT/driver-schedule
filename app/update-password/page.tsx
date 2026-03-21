"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const query = window.location.search || "";
    const hash = window.location.hash || "";
    router.replace(`/reset-password${query}${hash}`);
  }, [router]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    supabase.auth.getSession().then(() => {
      setReady(true);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    setErrorMessage(null);
    setIsSaving(true);

    const { error } = await supabase.auth.updateUser({
      password,
    });

    setIsSaving(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setMessage("Password updated successfully.");
    setTimeout(() => {
      router.push("/login");
    }, 1000);
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full rounded-xl border bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-semibold text-black">Choose a new password</h1>
        <p className="mb-6 text-sm text-gray-500">
          Enter a new password for the driver account.
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

        {!ready ? (
          <div className="text-sm text-gray-500">Preparing reset session...</div>
        ) : (
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-black">New password</label>
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
              disabled={isSaving}
              className="w-full rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            >
              {isSaving ? "Saving..." : "Update password"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}