"use client";

import Link from "next/link";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-gradient-to-b from-ocean-50 to-sand px-4">
      <div className="text-center max-w-lg">
        <Link href="/" className="inline-block mb-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/canitrunopenclawlogo.svg"
            alt="Can it run OpenClaw?"
            className="h-12 w-auto mx-auto"
          />
        </Link>

        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-ocean-100">
          <svg
            className="h-8 w-8 text-ocean-800"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
            />
          </svg>
        </div>

        <h1 className="font-heading text-2xl font-semibold text-navy">
          Something went wrong
        </h1>

        {error.message && (
          <p className="mt-3 text-sm text-navy-light/70 font-mono bg-ocean-50 rounded-md px-4 py-2 inline-block">
            {error.message}
          </p>
        )}

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center justify-center rounded-lg bg-ocean-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ocean-900 transition-colors cursor-pointer"
          >
            Try again
          </button>
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg border border-ocean-800/20 bg-white px-6 py-2.5 text-sm font-semibold text-ocean-800 shadow-sm hover:bg-ocean-50 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
