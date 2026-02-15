function categoryToSlug(category: string): string {
  return category
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");
}

export function devicePath(deviceSlug: string): string {
  return `/devices/${deviceSlug}`;
}

export function forkPath(forkSlug: string): string {
  return `/forks/${forkSlug}`;
}

export function canPath(forkSlug: string, deviceSlug: string): string {
  return `/can/${forkSlug}/run-on/${deviceSlug}`;
}

export function guidePath(forkSlug: string, deviceSlug: string): string {
  return `/guides/${forkSlug}-on-${deviceSlug}`;
}

export function bestPath(category: string, forkSlug: string): string {
  return `/best/${categoryToSlug(category)}-for-${forkSlug}`;
}

export function comparePath(deviceSlug1: string, deviceSlug2: string): string {
  return `/compare/${deviceSlug1}-vs-${deviceSlug2}`;
}
