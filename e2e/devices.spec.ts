import { test, expect } from "@playwright/test";

test.describe("Devices Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/devices");
  });

  test("renders page title and device cards", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/Devices/i);
    // Should have device cards (links to /devices/*)
    const cards = page.locator("a[href^='/devices/']");
    await expect(cards.first()).toBeVisible();
    const count = await cards.count();
    expect(count).toBeGreaterThan(0);
  });

  test("device cards show key info", async ({ page }) => {
    const firstCard = page.locator("a[href^='/devices/']").first();
    await expect(firstCard).toBeVisible();
    // Cards should show RAM
    await expect(firstCard.getByText(/RAM/)).toBeVisible();
  });

  test("search filters devices", async ({ page }) => {
    const searchInput = page.getByPlaceholder(/search/i);
    await expect(searchInput).toBeVisible();

    // Get initial count
    const initialCards = page.locator("a[href^='/devices/']");
    const initialCount = await initialCards.count();
    expect(initialCount).toBeGreaterThan(0);

    // Search for something specific
    await searchInput.fill("Raspberry");
    await searchInput.press("Enter");
    await page.waitForURL(/\?q=Raspberry/);

    // Results should show
    const results = page.locator("a[href^='/devices/']");
    const resultCount = await results.count();
    expect(resultCount).toBeGreaterThan(0);
    // Should be filtered (fewer or same)
    expect(resultCount).toBeLessThanOrEqual(initialCount);
  });

  test("category filter works", async ({ page }) => {
    // Click a category filter if sidebar is visible
    const sbcLink = page.getByRole("link", { name: "SBC", exact: true });
    if (await sbcLink.isVisible()) {
      await sbcLink.click();
      await expect(page).toHaveURL(/category=SBC/);
    }
  });

  test("clicking device card navigates to detail page", async ({ page }) => {
    const firstCard = page.locator("a[href^='/devices/']").first();
    const href = await firstCard.getAttribute("href");
    await firstCard.click();
    await expect(page).toHaveURL(href!);
  });
});

test.describe("Device Detail Page", () => {
  test("renders device details with specs", async ({ page }) => {
    // Navigate to devices first, then click one
    await page.goto("/devices");
    const firstCard = page.locator("a[href^='/devices/']").first();
    await firstCard.click();

    // Should show device name as heading
    const h1 = page.locator("h1");
    await expect(h1).toBeVisible();
    const name = await h1.textContent();
    expect(name!.length).toBeGreaterThan(0);

    // Should show specs section
    await expect(page.getByText(/Specifications|Specs/i)).toBeVisible();
  });

  test("shows fork compatibility section", async ({ page }) => {
    await page.goto("/devices");
    const firstCard = page.locator("a[href^='/devices/']").first();
    await firstCard.click();

    // Should show fork compatibility
    await expect(page.getByText(/Fork Compatibility|Compatible Forks/i)).toBeVisible();
  });

  test("shows community reports section", async ({ page }) => {
    await page.goto("/devices");
    const firstCard = page.locator("a[href^='/devices/']").first();
    await firstCard.click();

    await expect(page.getByText(/Community Reports/i)).toBeVisible();
  });

  test("breadcrumbs are visible", async ({ page }) => {
    await page.goto("/devices");
    const firstCard = page.locator("a[href^='/devices/']").first();
    await firstCard.click();

    // Should have a link back to devices
    const breadcrumbHome = page.getByRole("link", { name: /Home/i });
    await expect(breadcrumbHome).toBeVisible();
  });

  test("has correct page title", async ({ page }) => {
    await page.goto("/devices");
    const firstCard = page.locator("a[href^='/devices/']").first();
    await firstCard.click();

    const title = await page.title();
    expect(title).toContain("OpenClaw");
  });
});
