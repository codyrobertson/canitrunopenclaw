import Link from "next/link";
import type { DeviceWithScore } from "@/lib/queries";
import { VerdictBadge } from "./verdict-badge";
import { StarRating } from "./star-rating";

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

function formatPrice(price: number | null, type: string): string {
  if (!price) return "Free";
  return type === "monthly" ? `$${price}/mo` : `$${price}`;
}

export function DeviceCard({ device }: { device: DeviceWithScore }) {
  return (
    <Link
      href={`/devices/${device.slug}`}
      className="group block rounded-xl border border-ocean-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-ocean-400 transition-all"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium text-ocean-600 uppercase tracking-wider">
              {device.category}
            </span>
          </div>
          <h3 className="font-heading text-lg font-semibold text-navy group-hover:text-ocean-800 transition-colors truncate">
            {device.name}
          </h3>
          <p className="mt-1 text-sm text-navy-light line-clamp-2">
            {device.description}
          </p>
        </div>
        <div className="text-right shrink-0">
          <div className="text-lg font-bold text-ocean-800">
            {formatPrice(device.price_usd, device.price_type)}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-navy-light">
        <span className="rounded bg-ocean-100 px-2 py-0.5">{formatRam(device.ram_gb)} RAM</span>
        {device.cpu && <span className="rounded bg-ocean-100 px-2 py-0.5 truncate max-w-[200px]">{device.cpu}</span>}
        {device.power_watts && <span className="rounded bg-ocean-100 px-2 py-0.5">{device.power_watts}W</span>}
      </div>

      <div className="mt-3 flex items-center justify-between">
        {device.best_verdict && <VerdictBadge verdict={device.best_verdict} size="sm" />}
        <StarRating rating={device.avg_rating ?? 0} count={device.rating_count} />
      </div>
    </Link>
  );
}
