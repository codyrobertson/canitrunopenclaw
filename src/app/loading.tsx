export default function Loading() {
  return (
    <main className="min-h-[80vh] flex items-center justify-center bg-sand">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-10 w-10">
          <div className="absolute inset-0 rounded-full border-4 border-ocean-200" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-ocean-700 animate-spin" />
        </div>
        <p className="text-sm font-medium text-navy-light">Loading...</p>
      </div>
    </main>
  );
}
