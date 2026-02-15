import { ExternalLink, ShoppingCart } from "lucide-react";

type Variant = "primary" | "secondary" | "tertiary";

const VARIANT_STYLES: Record<Variant, string> = {
  primary:
    "bg-ocean-800 text-white hover:bg-ocean-700 hover:shadow-md shadow-sm",
  secondary:
    "bg-white text-navy border border-ocean-200 hover:border-ocean-400 hover:bg-ocean-50",
  tertiary:
    "bg-transparent text-ocean-700 hover:text-ocean-800 hover:bg-ocean-50 underline-offset-2",
};

export function BuyButton({
  href,
  network,
  label,
  variant = "primary",
  size = "md",
}: {
  href: string;
  network: string;
  label: string | null;
  variant?: Variant;
  size?: "sm" | "md";
}) {
  const displayName = label ?? network;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className={`inline-flex items-center gap-2 rounded-lg font-semibold transition-all active:scale-[0.98] ${VARIANT_STYLES[variant]} ${
        size === "sm" ? "px-3.5 py-2.5 text-xs" : "px-5 py-3 text-sm"
      }`}
    >
      <ShoppingCart
        size={size === "sm" ? 13 : 15}
        className={variant === "primary" ? "opacity-80" : "text-ocean-500"}
      />
      <span>Buy on {displayName}</span>
      <ExternalLink
        size={size === "sm" ? 10 : 12}
        className={`ml-auto ${variant === "primary" ? "opacity-50" : "text-ocean-400"}`}
      />
    </a>
  );
}

export function BuyButtonFallback({
  href,
  name,
}: {
  href: string;
  name: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener"
      className="inline-flex items-center gap-2 rounded-lg bg-ocean-800 text-white font-semibold px-5 py-3 text-sm transition-all hover:bg-ocean-700 hover:shadow-md active:scale-[0.98] shadow-sm"
    >
      <ShoppingCart size={15} className="opacity-80" />
      <span>Buy {name}</span>
      <ExternalLink size={12} className="opacity-50 ml-auto" />
    </a>
  );
}
