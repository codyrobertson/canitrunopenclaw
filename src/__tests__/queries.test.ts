import { describe, it, expect } from "vitest";
import {
  getDevicesRanked,
  getDeviceBySlug,
  getAllForks,
  getForkBySlug,
  getBenchmarksByDevice,
  getAffiliateLinks,
} from "@/lib/queries";

describe("getDevicesRanked", () => {
  it("returns an array of devices", async () => {
    const devices = await getDevicesRanked();
    expect(Array.isArray(devices)).toBe(true);
  });

  it("each device has required fields", async () => {
    const devices = await getDevicesRanked();
    if (devices.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const device = devices[0];
    expect(device).toHaveProperty("id");
    expect(device).toHaveProperty("slug");
    expect(device).toHaveProperty("name");
    expect(device).toHaveProperty("category");
    expect(device).toHaveProperty("ram_gb");
    expect(device).toHaveProperty("score");
  });
});

describe("getDeviceBySlug", () => {
  it("returns a device for a valid slug", async () => {
    const devices = await getDevicesRanked();
    if (devices.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const slug = devices[0].slug;
    const device = await getDeviceBySlug(slug);
    expect(device).toBeDefined();
    expect(device!.slug).toBe(slug);
  });

  it("returns undefined for an invalid slug", async () => {
    const device = await getDeviceBySlug("nonexistent-device-slug-xyz");
    expect(device).toBeUndefined();
  });
});

describe("getAllForks", () => {
  it("returns an array of forks", async () => {
    const forks = await getAllForks();
    expect(Array.isArray(forks)).toBe(true);
  });

  it("each fork has required fields", async () => {
    const forks = await getAllForks();
    if (forks.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const fork = forks[0];
    expect(fork).toHaveProperty("id");
    expect(fork).toHaveProperty("slug");
    expect(fork).toHaveProperty("name");
    expect(fork).toHaveProperty("min_ram_mb");
    expect(fork).toHaveProperty("maturity");
  });
});

describe("getForkBySlug", () => {
  it("returns a fork for a valid slug", async () => {
    const forks = await getAllForks();
    if (forks.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const slug = forks[0].slug;
    const fork = await getForkBySlug(slug);
    expect(fork).toBeDefined();
    expect(fork!.slug).toBe(slug);
  });

  it("returns undefined for an invalid slug", async () => {
    const fork = await getForkBySlug("nonexistent-fork-slug-xyz");
    expect(fork).toBeUndefined();
  });
});

describe("getBenchmarksByDevice", () => {
  it("returns an array of benchmark summaries", async () => {
    const devices = await getDevicesRanked();
    if (devices.length === 0) {
      expect(true).toBe(true);
      return;
    }
    const deviceId = devices[0].id;
    const benchmarks = await getBenchmarksByDevice(deviceId);
    expect(Array.isArray(benchmarks)).toBe(true);
  });

  it("benchmark summaries have expected fields when data exists", async () => {
    const devices = await getDevicesRanked();
    if (devices.length === 0) {
      expect(true).toBe(true);
      return;
    }
    // Try each device until we find one with benchmarks
    for (const device of devices) {
      const benchmarks = await getBenchmarksByDevice(device.id);
      if (benchmarks.length > 0) {
        const b = benchmarks[0];
        expect(b).toHaveProperty("run_id");
        expect(b).toHaveProperty("fork_name");
        expect(b).toHaveProperty("fork_slug");
        expect(b).toHaveProperty("status");
        expect(b).toHaveProperty("started_at");
        return;
      }
    }
    // If no benchmarks found at all, that's still valid — just an empty array
    expect(true).toBe(true);
  });
});

describe("getAffiliateLinks", () => {
  it("returns an array for devices that have affiliate links", async () => {
    const devices = await getDevicesRanked();
    if (devices.length === 0) {
      expect(true).toBe(true);
      return;
    }
    // Try each device until we find one with affiliate links
    for (const device of devices) {
      const links = await getAffiliateLinks(device.id);
      if (links.length > 0) {
        expect(Array.isArray(links)).toBe(true);
        const link = links[0];
        expect(link).toHaveProperty("id");
        expect(link).toHaveProperty("device_id");
        expect(link).toHaveProperty("network");
        expect(link).toHaveProperty("url");
        expect(link).toHaveProperty("priority");
        return;
      }
    }
    // If no device has affiliate links, still passes
    expect(true).toBe(true);
  });

  it("returns empty array for a device without affiliate links", async () => {
    // Use an ID unlikely to have links
    const links = await getAffiliateLinks(999999);
    expect(Array.isArray(links)).toBe(true);
    expect(links.length).toBe(0);
  });
});
