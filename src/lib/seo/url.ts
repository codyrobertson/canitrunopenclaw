import { SITE_URL } from "./site";

export function toAbsoluteUrl(path: string): string {
  const base = SITE_URL.replace(/\/$/, "");
  const normalized = path.startsWith("/") ? path : `/${path}`;
  if (normalized === "/") return `${base}/`;
  return `${base}${normalized}`;
}
