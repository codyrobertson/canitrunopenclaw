import type { BreadcrumbItem } from "./schema";
import { bestPath, canPath, comparePath, devicePath, forkPath, guidePath } from "./routes";

export type InternalLink = {
  href: string;
  label: string;
};

export function breadcrumbsForFork(fork: { name: string; slug: string }): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Forks", path: "/forks" },
    { name: fork.name, path: forkPath(fork.slug) },
  ];
}

export function breadcrumbsForDevice(device: { name: string; slug: string }): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Devices", path: "/devices" },
    { name: device.name, path: devicePath(device.slug) },
  ];
}

export function breadcrumbsForCan(args: {
  fork: { name: string; slug: string };
  device: { name: string; slug: string };
}): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Forks", path: "/forks" },
    { name: args.fork.name, path: forkPath(args.fork.slug) },
    { name: args.device.name, path: canPath(args.fork.slug, args.device.slug) },
  ];
}

export function breadcrumbsForGuide(args: {
  fork: { name: string; slug: string };
  device: { name: string; slug: string };
}): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Forks", path: "/forks" },
    { name: args.fork.name, path: forkPath(args.fork.slug) },
    { name: `Setup on ${args.device.name}`, path: guidePath(args.fork.slug, args.device.slug) },
  ];
}

export function breadcrumbsForBest(args: {
  fork: { name: string; slug: string };
  category: string;
}): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Forks", path: "/forks" },
    { name: args.fork.name, path: forkPath(args.fork.slug) },
    { name: `Best ${args.category}`, path: bestPath(args.category, args.fork.slug) },
  ];
}

export function breadcrumbsForCompare(args: {
  device1: { name: string; slug: string };
  device2: { name: string; slug: string };
}): BreadcrumbItem[] {
  return [
    { name: "Home", path: "/" },
    { name: "Compare", path: "/compare" },
    {
      name: `${args.device1.name} vs ${args.device2.name}`,
      path: comparePath(args.device1.slug, args.device2.slug),
    },
  ];
}

export function relatedLinksForCan(args: {
  fork: { name: string; slug: string };
  device: { name: string; slug: string; category: string };
}): InternalLink[] {
  return [
    { href: devicePath(args.device.slug), label: `${args.device.name} compatibility` },
    { href: forkPath(args.fork.slug), label: `All ${args.fork.name} devices` },
    { href: bestPath(args.device.category, args.fork.slug), label: `Best ${args.device.category} for ${args.fork.name}` },
    { href: guidePath(args.fork.slug, args.device.slug), label: `Setup guide for ${args.fork.name} on ${args.device.name}` },
  ];
}

export function relatedLinksForGuide(args: {
  fork: { name: string; slug: string };
  device: { name: string; slug: string; category: string };
}): InternalLink[] {
  return [
    { href: canPath(args.fork.slug, args.device.slug), label: `Compatibility verdict for ${args.fork.name} on ${args.device.name}` },
    { href: devicePath(args.device.slug), label: `${args.device.name} details` },
    { href: forkPath(args.fork.slug), label: `All ${args.fork.name} devices` },
    { href: bestPath(args.device.category, args.fork.slug), label: `Best ${args.device.category} for ${args.fork.name}` },
  ];
}

export function relatedLinksForBest(args: {
  fork: { name: string; slug: string };
  category: string;
  topDevices: { name: string; slug: string }[];
}): InternalLink[] {
  const links: InternalLink[] = [
    { href: forkPath(args.fork.slug), label: `All ${args.fork.name} devices` },
  ];

  for (const device of args.topDevices.slice(0, 3)) {
    links.push({
      href: canPath(args.fork.slug, device.slug),
      label: `Can ${args.fork.name} run on ${device.name}?`,
    });
  }

  links.push({ href: "/devices", label: "Browse all devices" });
  return links;
}

export function relatedLinksForCompare(args: {
  device1: { name: string; slug: string };
  device2: { name: string; slug: string };
}): InternalLink[] {
  return [
    { href: devicePath(args.device1.slug), label: `${args.device1.name} details` },
    { href: devicePath(args.device2.slug), label: `${args.device2.name} details` },
    { href: "/compare", label: "Browse comparisons" },
  ];
}
