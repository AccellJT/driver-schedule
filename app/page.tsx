"use client";

import Link from "next/link";

export default function HomePage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 px-4 dark:from-zinc-900 dark:to-zinc-800">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900">
        <div className="mb-8 text-center">
          <img
            src="/logo.png"
            alt="Accell"
            className="mx-auto mb-2 h-14 object-contain"
          />
        </div>

        <div className="space-y-4">
          <Link
            href="/driver-login"
            className="block w-full rounded-lg bg-blue-600 px-4 py-3 text-center text-sm font-medium text-white hover:bg-blue-700"
          >
            Contractor Driver
          </Link>

          <Link
            href="/login"
            className="block w-full rounded-lg border border-zinc-300 bg-zinc-100 px-4 py-3 text-center text-sm font-medium text-zinc-800 hover:bg-zinc-200 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Dispatch
          </Link>
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          © {new Date().getFullYear()} Accell
        </div>
      </div>
    </main>
  );
}