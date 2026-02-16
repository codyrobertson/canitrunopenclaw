import { test, expect } from "@playwright/test";

test.describe("Forks Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forks");
  });

  test("renders page title and fork cards", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Forks/i);
    const forkCards = page.locator("a[href^='/forks/']");
    await expect(forkCards.first()).toBeVisible();
    const count = await forkCards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("fork cards show language badge", async ({ page }) => {
    const firstCard = page.locator("a[href^='/forks/']").first();
    await expect(firstCard).toBeVisible();
    // Should show a language (TypeScript, Python, Go, etc.)
    const langBadge = firstCard.locator("span.font-mono").first();
    await expect(langBadge).toBeVisible();
  });

  test("fork cards show maturity badge", async ({ page }) => {
    const firstCard = page.locator("a[href^='/forks/']").first();
    // Should show maturity (stable, beta, alpha)
    const maturity = firstCard.getByText(/stable|beta|alpha/i).first();
    await expect(maturity).toBeVisible();
  });

  test("fork cards show GitHub stars", async ({ page }) => {
    // At least one fork should have stars
    const starBadges = page.locator("text=/\\d+(\\.\\d)?k?/");
    const count = await starBadges.count();
    expect(count).toBeGreaterThan(0);
  });

  test("quick comparison bar is visible", async ({ page }) => {
    // The horizontal scrolling bar at top
    const scrollBar = page.locator(".overflow-x-auto").first();
    await expect(scrollBar).toBeVisible();
  });

  test("clicking fork card navigates to detail page", async ({ page }) => {
    // Use the grid cards (not the quick bar)
    const forkCard = page.locator(".grid a[href^='/forks/']").first();
    const href = await forkCard.getAttribute("href");
    await forkCard.click();
    await expect(page).toHaveURL(href!);
  });
});

test.describe("Fork Detail Page", () => {
  test("renders fork details", async ({ page }) => {
    await page.goto("/forks");
    const forkCard = page.locator(".grid a[href^='/forks/']").first();
    await forkCard.click();

    // Should show fork name
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();

    // Should show description
    const description = page.locator("p").first();
    await expect(description).toBeVisible();
  });

  test("shows compatible devices list", async ({ page }) => {
    await page.goto("/forks");
    const forkCard = page.locator(".grid a[href^='/forks/']").first();
    await forkCard.click();

    await expect(page.getByText(/Compatible Devices|Devices/i)).toBeVisible();
  });

  test("shows system requirements", async ({ page }) => {
    await page.goto("/forks");
    const forkCard = page.locator(".grid a[href^='/forks/']").first();
    await forkCard.click();

    // Should show min RAM
    await expect(page.getByText(/min RAM|Minimum/i)).toBeVisible();
  });
});
