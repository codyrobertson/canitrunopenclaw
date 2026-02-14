import { notFound } from "next/navigation";
import Link from "next/link";
import { getDeviceBySlug, getVerdictsByDevice, getCommentsByDevice, getDeviceRatings } from "@/lib/queries";
import { auth } from "@/lib/auth";
import { VerdictBadge } from "@/components/verdict-badge";
import { StarRating } from "@/components/star-rating";
import { CommentSection } from "@/components/comment-section";

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

export default async function DeviceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const device = getDeviceBySlug(slug);
  if (!device) notFound();

  const verdicts = getVerdictsByDevice(device.id);
  const comments = getCommentsByDevice(device.id);
  const ratings = getDeviceRatings(device.id);
  const session = await auth();

  return (
    <main className="mx-auto max-w-4xl px-4 py-8">
      <nav className="text-sm text-navy-light mb-6">
        <Link href="/devices" className="hover:text-ocean-800">Devices</Link>
        <span className="mx-2">/</span>
        <span className="text-navy">{device.name}</span>
      </nav>

      {/* Header */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8 mb-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <span className="text-xs font-medium text-ocean-600 uppercase tracking-wider">{device.category}</span>
            <h1 className="font-heading text-3xl font-bold text-navy mt-1">{device.name}</h1>
            <p className="mt-2 text-navy-light">{device.description}</p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-2xl font-bold text-ocean-800">
              {device.price_usd ? (device.price_type === "monthly" ? `$${device.price_usd}/mo` : `$${device.price_usd}`) : "Free"}
            </div>
            {device.buy_link && <a href={device.buy_link} target="_blank" rel="noopener" className="mt-1 text-sm text-ocean-600 hover:underline">Buy →</a>}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="rounded-lg bg-ocean-50 p-3">
            <div className="text-xs text-ocean-600 font-medium">RAM</div>
            <div className="text-lg font-semibold text-navy">{formatRam(device.ram_gb)}</div>
          </div>
          {device.cpu && <div className="rounded-lg bg-ocean-50 p-3"><div className="text-xs text-ocean-600 font-medium">CPU</div><div className="text-sm font-semibold text-navy">{device.cpu}</div></div>}
          {device.gpu && <div className="rounded-lg bg-ocean-50 p-3"><div className="text-xs text-ocean-600 font-medium">GPU</div><div className="text-sm font-semibold text-navy">{device.gpu}</div></div>}
          {device.power_watts && <div className="rounded-lg bg-ocean-50 p-3"><div className="text-xs text-ocean-600 font-medium">Power</div><div className="text-lg font-semibold text-navy">{device.power_watts}W</div></div>}
        </div>

        <div className="mt-6"><StarRating rating={ratings.avg ?? 0} count={ratings.count} /></div>
      </div>

      {/* Compatibility Verdicts */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8 mb-6">
        <h2 className="font-heading text-xl font-semibold text-navy mb-4">Fork Compatibility</h2>
        <div className="space-y-4">
          {verdicts.map((v) => (
            <div key={v.id} className="flex items-start gap-4 rounded-lg border border-ocean-100 p-4">
              <VerdictBadge verdict={v.verdict} />
              <div className="flex-1">
                <Link href={`/forks/${v.fork_slug}`} className="font-medium text-navy hover:text-ocean-800">{v.fork_name}</Link>
                {v.notes && <p className="mt-1 text-sm text-navy-light">{v.notes}</p>}
                <div className="mt-2 flex gap-4 text-xs text-navy-light">
                  {v.tokens_per_sec && <span>&#9889; {v.tokens_per_sec} tok/s</span>}
                  {v.cold_start_sec && <span>&#129482; {v.cold_start_sec}s cold start</span>}
                  {v.warm_response_sec && <span>&#128293; {v.warm_response_sec}s warm</span>}
                </div>
              </div>
            </div>
          ))}
          {verdicts.length === 0 && <p className="text-sm text-navy-light text-center py-4">No compatibility data yet.</p>}
        </div>
      </div>

      {/* Comments */}
      <div className="rounded-xl border border-ocean-200 bg-white p-8">
        <CommentSection comments={comments} deviceId={device.id} isSignedIn={!!session?.user} />
      </div>
    </main>
  );
}
