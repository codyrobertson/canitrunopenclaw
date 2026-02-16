import { test, expect } from "@playwright/test";

test.describe("Performance", () => {
  test("homepage loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test("devices page loads within 5 seconds", async ({ page }) => {
    const start = Date.now();
    await page.goto("/devices", { waitUntil: "domcontentloaded" });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(5000);
  });

  test("no console errors on homepage", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    await page.goto("/");
    await page.waitForTimeout(2000);
    // Filter out known benign errors (e.g. PostHog, favicon)
    const realErrors = errors.filter(
      (e) => !e.includes("posthog") && !e.includes("favicon") && !e.includes("Failed to load resource")
    );
    expect(realErrors).toHaveLength(0);
  });

  test("no console errors on devices page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });
    await page.goto("/devices");
    await page.waitForTimeout(2000);
    const realErrors = errors.filter(
      (e) => !e.includes("posthog") && !e.includes("favicon") && !e.includes("Failed to load resource")
    );
    expect(realErrors).toHaveLength(0);
  });

  test("no broken images on homepage", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const naturalWidth = await images.nth(i).evaluate((el: HTMLImageElement) => el.naturalWidth);
      const src = await images.nth(i).getAttribute("src");
      expect(naturalWidth, `Broken image: ${src}`).toBeGreaterThan(0);
    }
  });

  test("page does not have excessive DOM size", async ({ page }) => {
    await page.goto("/");
    const nodeCount = await page.evaluate(() => document.querySelectorAll("*").length);
    // Should not exceed 3000 nodes for homepage
    expect(nodeCount).toBeLessThan(3000);
  });
});
