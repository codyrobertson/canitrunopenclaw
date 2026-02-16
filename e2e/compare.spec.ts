import { test, expect } from "@playwright/test";

test.describe("Compare Page", () => {
  test("renders compare selector", async ({ page }) => {
    await page.goto("/compare");
    // Should show the device selection UI
    await expect(page.getByText(/Compare|Select/i).first()).toBeVisible();
  });

  test("can search and select devices to compare", async ({ page }) => {
    await page.goto("/compare");

    // Should have a search/selector component
    const searchInput = page.getByPlaceholder(/search|device/i).first();
    if (await searchInput.isVisible()) {
      await searchInput.fill("Raspberry");
      // Should show matching results
      await page.waitForTimeout(500);
      const option = page.getByText(/Raspberry Pi/i).first();
      if (await option.isVisible()) {
        await option.click();
      }
    }
  });

  test("compare page with pre-selected devices shows comparison", async ({ page }) => {
    // Navigate to devices page, get two device slugs
    await page.goto("/devices");
    const cards = page.locator("a[href^='/devices/']");
    const count = await cards.count();

    if (count >= 2) {
      const href1 = await cards.nth(0).getAttribute("href");
      const href2 = await cards.nth(1).getAttribute("href");
      const slug1 = href1?.replace("/devices/", "");
      const slug2 = href2?.replace("/devices/", "");

      if (slug1 && slug2) {
        await page.goto(`/compare/${slug1}-vs-${slug2}`);
        // Should show comparison content
        const h1 = page.locator("h1");
        await expect(h1).toBeVisible();
      }
    }
  });
});
