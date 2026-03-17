"use client";

import { useRouter } from "next/navigation";

export default function HomePage() {
  const router = useRouter();

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-900 dark:to-zinc-800">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl dark:bg-zinc-900">
        <div className="mb-8 text-center">
          {/* Replace with your logo */}
          <div className="mb-4 text-2xl font-bold">Accell</div>
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            Welcome to Accell Drive
          </h1>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            Select your portal to continue
          </p>
        </div>

        <div className="space-y-4">
          <button
            onClick={() => router.push("/login")}
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-medium text-white hover:bg-blue-700"
          >
            Dispatcher Login
          </button>

          <button
            onClick={() => router.push("/driver-login")}
            className="w-full rounded-lg border border-zinc-300 bg-white px-4 py-3 text-sm font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-100 dark:hover:bg-zinc-700"
          >
            Contractor Login
          </button>
        </div>

        <div className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
          © {new Date().getFullYear()} Accell
        </div>
      </div>
    </main>
  );
}
