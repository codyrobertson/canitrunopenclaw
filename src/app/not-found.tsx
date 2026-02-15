import Link from "next/link";

export default function NotFound() {
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

        <p className="font-heading text-[8rem] leading-none font-bold bg-gradient-to-b from-ocean-800 to-ocean-500 bg-clip-text text-transparent select-none">
          404
        </p>

        <h1 className="font-heading text-2xl font-semibold text-navy mt-4">
          Page not found
        </h1>

        <p className="text-navy-light mt-3 text-base leading-relaxed">
          The device you&apos;re looking for might have been moved or doesn&apos;t exist.
        </p>

        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center rounded-lg bg-ocean-800 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-ocean-900 transition-colors"
          >
            Back to Home
          </Link>
          <Link
            href="/devices"
            className="inline-flex items-center justify-center rounded-lg border border-ocean-800/20 bg-white px-6 py-2.5 text-sm font-semibold text-ocean-800 shadow-sm hover:bg-ocean-50 transition-colors"
          >
            Browse Devices
          </Link>
        </div>
      </div>
    </main>
  );
}
