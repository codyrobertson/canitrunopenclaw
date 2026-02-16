import Link from "next/link";
import type { DeviceWithScore } from "@/lib/queries";
import { VerdictBadge } from "./verdict-badge";
import { StarRating } from "./star-rating";
import {
  Cpu, Cloud, Monitor, Laptop, CircuitBoard, Smartphone,
  HardDrive, Server, Gamepad2, Router, Home, Tablet,
  Box, type LucideIcon,
} from "lucide-react";

function formatRam(gb: number): string {
  if (gb < 0.001) return `${Math.round(gb * 1024 * 1024)}KB`;
  if (gb < 1) return `${Math.round(gb * 1024)}MB`;
  return `${gb}GB`;
}

function formatPrice(price: number | null, type: string | null): string {
  if (!price) return "Free";
  return type === "monthly" ? `$${price}/mo` : `$${price}`;
}

const categoryConfig: Record<string, { Icon: LucideIcon; color: string }> = {
  SBC: { Icon: Cpu, color: "bg-ocean-100 text-ocean-700" },
  Desktop: { Icon: Monitor, color: "bg-ocean-100 text-ocean-700" },
  Laptop: { Icon: Laptop, color: "bg-ocean-100 text-ocean-700" },
  Server: { Icon: Server, color: "bg-ocean-100 text-ocean-700" },
  Cloud: { Icon: Cloud, color: "bg-ocean-100 text-ocean-700" },
  Microcontroller: { Icon: CircuitBoard, color: "bg-amber-100 text-amber-700" },
  Handheld: { Icon: Gamepad2, color: "bg-ocean-100 text-ocean-700" },
  Appliance: { Icon: Home, color: "bg-ocean-100 text-ocean-700" },
  NAS: { Icon: HardDrive, color: "bg-ocean-100 text-ocean-700" },
  Phone: { Icon: Smartphone, color: "bg-ocean-100 text-ocean-700" },
  Tablet: { Icon: Tablet, color: "bg-ocean-100 text-ocean-700" },
  "Mini PC": { Icon: Box, color: "bg-ocean-100 text-ocean-700" },
  Router: { Icon: Router, color: "bg-ocean-100 text-ocean-700" },
};

export function CategoryBadge({ category }: { category: string }) {
  const config = categoryConfig[category] ?? { Icon: Cpu, color: "bg-gray-100 text-gray-700" };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${config.color}`}>
      <config.Icon size={12} />
      {category}
    </span>
  );
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
            <CategoryBadge category={device.category} />
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

      <div className="mt-3 flex flex-wrap items-center gap-1.5 sm:gap-2 text-xs text-navy-light">
        <span className="rounded bg-ocean-100 px-2 py-0.5">{formatRam(device.ram_gb)} RAM</span>
        {device.cpu && <span className="rounded bg-ocean-100 px-2 py-0.5 truncate max-w-[140px] sm:max-w-[200px]">{device.cpu}</span>}
        {device.power_watts && <span className="rounded bg-ocean-100 px-2 py-0.5">{device.power_watts}W</span>}
      </div>

      <div className="mt-3 flex items-center justify-between">
        {device.best_verdict && <VerdictBadge verdict={device.best_verdict} size="sm" />}
        <StarRating rating={device.avg_rating ?? 0} count={device.rating_count} />
      </div>
    </Link>
  );
}
