import { describe, expect, test } from "vitest";

import { bestPath, canPath, comparePath, devicePath, forkPath, guidePath } from "@/lib/seo/routes";

describe("SEO route helpers", () => {
  test("canPath builds fork+device path", () => {
    expect(canPath("openclaw", "raspberry-pi-5")).toBe("/can/openclaw/run-on/raspberry-pi-5");
  });

  test("guidePath builds fork+device guide path", () => {
    expect(guidePath("openclaw", "raspberry-pi-5")).toBe("/guides/openclaw-on-raspberry-pi-5");
  });

  test("bestPath slugifies category", () => {
    expect(bestPath("Mini PC", "openclaw")).toBe("/best/mini-pc-for-openclaw");
  });

  test("comparePath builds comparison path", () => {
    expect(comparePath("raspberry-pi-5", "raspberry-pi-4")).toBe("/compare/raspberry-pi-5-vs-raspberry-pi-4");
  });

  test("devicePath and forkPath build hub paths", () => {
    expect(devicePath("raspberry-pi-5")).toBe("/devices/raspberry-pi-5");
    expect(forkPath("openclaw")).toBe("/forks/openclaw");
  });
});
