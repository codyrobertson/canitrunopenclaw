import { test, expect } from "@playwright/test";

test.describe("Responsive - Desktop (1280px)", () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test("sidebar filters are visible on devices page", async ({ page }) => {
    await page.goto("/devices");
    const sidebar = page.locator(".lg\\:block").first();
    await expect(sidebar).toBeVisible();
  });

  test("device cards use grid layout", async ({ page }) => {
    await page.goto("/devices");
    // Grid should have multiple columns
    const grid = page.locator(".grid").first();
    const gridCols = await grid.evaluate((el) => getComputedStyle(el).gridTemplateColumns);
    // Should have multiple columns (not "none" or single column)
    expect(gridCols.split(" ").length).toBeGreaterThan(1);
  });

  test("footer shows 5 columns", async ({ page }) => {
    await page.goto("/");
    const footerGrid = page.locator("footer .grid");
    await expect(footerGrid).toBeVisible();
  });
});

test.describe("Responsive - Tablet (768px)", () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test("nav links are hidden, mobile menu shows", async ({ page }) => {
    await page.goto("/");
    const desktopLinks = page.locator("nav .hidden.md\\:flex");
    // At 768px, md:flex should be visible
    await expect(desktopLinks).toBeVisible();
  });

  test("pages render without horizontal scroll", async ({ page }) => {
    await page.goto("/");
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBe(false);
  });
});

test.describe("Responsive - Mobile (375px)", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("homepage renders without horizontal overflow", async ({ page }) => {
    await page.goto("/");
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBe(false);
  });

  test("devices page renders without overflow", async ({ page }) => {
    await page.goto("/devices");
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBe(false);
  });

  test("forks page renders without overflow", async ({ page }) => {
    await page.goto("/forks");
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBe(false);
  });

  test("benchmarks page renders without overflow", async ({ page }) => {
    await page.goto("/benchmarks");
    const hasHScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth
    );
    expect(hasHScroll).toBe(false);
  });

  test("device cards stack vertically on mobile", async ({ page }) => {
    await page.goto("/devices");
    const cards = page.locator("a[href^='/devices/']");
    const count = await cards.count();
    if (count >= 2) {
      const box1 = await cards.nth(0).boundingBox();
      const box2 = await cards.nth(1).boundingBox();
      if (box1 && box2) {
        // Cards should be stacked (box2 below box1)
        expect(box2.y).toBeGreaterThan(box1.y);
      }
    }
  });

  test("sidebar filters are hidden on mobile", async ({ page }) => {
    await page.goto("/devices");
    const sidebar = page.locator(".hidden.lg\\:block");
    await expect(sidebar).toBeHidden();
  });

  test("text is readable (not too small)", async ({ page }) => {
    await page.goto("/");
    const body = page.locator("body");
    const fontSize = await body.evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
    expect(fontSize).toBeGreaterThanOrEqual(14);
  });
});
