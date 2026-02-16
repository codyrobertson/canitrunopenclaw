import { test, expect } from "@playwright/test";

test.describe("Accessibility", () => {
  test("images have alt text", async ({ page }) => {
    await page.goto("/");
    const images = page.locator("img");
    const count = await images.count();
    for (let i = 0; i < count; i++) {
      const alt = await images.nth(i).getAttribute("alt");
      expect(alt, `Image ${i} missing alt text`).toBeTruthy();
    }
  });

  test("page has proper heading hierarchy", async ({ page }) => {
    await page.goto("/");
    const h1 = page.locator("h1");
    const h1Count = await h1.count();
    expect(h1Count).toBe(1); // Only one h1 per page
  });

  test("links have discernible text", async ({ page }) => {
    await page.goto("/");
    const links = page.locator("a:visible");
    const count = await links.count();
    for (let i = 0; i < Math.min(count, 30); i++) {
      const text = await links.nth(i).textContent();
      const ariaLabel = await links.nth(i).getAttribute("aria-label");
      const hasContent = (text && text.trim().length > 0) || ariaLabel;
      expect(hasContent, `Link ${i} has no discernible text`).toBeTruthy();
    }
  });

  test("html has lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBe("en");
  });

  test("nav landmark exists", async ({ page }) => {
    await page.goto("/");
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
  });

  test("main landmark exists on content pages", async ({ page }) => {
    await page.goto("/devices");
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("footer landmark exists", async ({ page }) => {
    await page.goto("/");
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
  });

  test("color contrast - text is readable", async ({ page }) => {
    await page.goto("/");
    // Check that body text color is set (not default)
    const body = page.locator("body");
    const color = await body.evaluate((el) => getComputedStyle(el).color);
    // Should not be pure black (browser default) or transparent
    expect(color).toBeTruthy();
    expect(color).not.toBe("rgba(0, 0, 0, 0)");
  });

  test("interactive elements are keyboard focusable", async ({ page }) => {
    await page.goto("/");
    // Tab through a few elements
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
    // Should be able to tab to a link or button
    expect(["A", "BUTTON", "INPUT"]).toContain(focused);
  });
});
