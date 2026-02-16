import { test, expect } from "@playwright/test";

test.describe("User Flow: Browse → Device → Fork", () => {
  test("user can browse devices, click one, then navigate to a fork", async ({ page }) => {
    // 1. Start on homepage
    await page.goto("/");

    // 2. Click "Browse Devices" or navigate to devices
    await page.locator("nav").getByRole("link", { name: "Devices" }).click();
    await expect(page).toHaveURL(/\/devices/);

    // 3. Click first device
    const deviceCard = page.locator("a[href^='/devices/']").first();
    const deviceName = await deviceCard.locator("h3").textContent();
    await deviceCard.click();

    // 4. Verify device page loaded
    await expect(page.locator("h1")).toContainText(deviceName!.trim());

    // 5. Find a fork link on the device page and click it
    const forkLink = page.locator("a[href^='/forks/']").first();
    if (await forkLink.isVisible()) {
      await forkLink.click();
      await expect(page).toHaveURL(/\/forks\//);
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});

test.describe("User Flow: Search → Device", () => {
  test("user searches for a device and navigates to it", async ({ page }) => {
    await page.goto("/");

    // Search for raspberry pi
    const searchInput = page.getByPlaceholder(/search/i).first();
    await searchInput.fill("Raspberry");
    await searchInput.press("Enter");

    // Should be on devices page with search results
    await expect(page).toHaveURL(/devices.*q=Raspberry/i);

    // Click first result
    const result = page.locator("a[href^='/devices/']").first();
    await expect(result).toBeVisible();
    await expect(result).toContainText(/Raspberry/i);
    await result.click();

    // Should be on device detail page
    await expect(page.locator("h1")).toContainText(/Raspberry/i);
  });
});

test.describe("User Flow: Forks → Fork Detail → Device", () => {
  test("user browses forks, clicks one, then navigates to a compatible device", async ({
    page,
  }) => {
    // 1. Go to forks page
    await page.goto("/forks");

    // 2. Click first fork card (in the grid, not the quick bar)
    const forkCard = page.locator(".grid a[href^='/forks/']").first();
    await forkCard.click();
    await expect(page).toHaveURL(/\/forks\//);

    // 3. Find a device link in the compatible devices section
    const deviceLink = page.locator("a[href^='/devices/']").first();
    if (await deviceLink.isVisible()) {
      await deviceLink.click();
      await expect(page).toHaveURL(/\/devices\//);
      await expect(page.locator("h1")).toBeVisible();
    }
  });
});

test.describe("User Flow: Compare Devices", () => {
  test("user navigates to compare page and sees selection UI", async ({ page }) => {
    await page.goto("/");
    await page.locator("nav").getByRole("link", { name: "Compare" }).click();
    await expect(page).toHaveURL(/\/compare/);

    // Compare page should show a way to select devices
    await expect(page.getByText(/Compare|Select|Choose/i).first()).toBeVisible();
  });
});

test.describe("User Flow: Benchmarks Exploration", () => {
  test("user views benchmarks and explores how it works", async ({ page }) => {
    await page.goto("/benchmarks");

    // Should see the leaderboard
    await expect(page.locator("h1")).toContainText(/ClawBench|Benchmark/i);

    // Scroll to how it works
    const howItWorks = page.getByText(/How ClawBench Works/i);
    await howItWorks.scrollIntoViewIfNeeded();
    await expect(howItWorks).toBeVisible();

    // Should see scoring section
    await expect(page.getByText(/Scoring/i).first()).toBeVisible();
  });
});

test.describe("User Flow: Footer Navigation", () => {
  test("user can navigate to pages from footer", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");

    // Click "All Devices" in footer
    const devicesLink = footer.getByRole("link", { name: "All Devices" });
    await devicesLink.click();
    await expect(page).toHaveURL(/\/devices/);
  });

  test("user can navigate to getting started guide from footer", async ({ page }) => {
    await page.goto("/");

    const footer = page.locator("footer");
    const guideLink = footer.getByRole("link", { name: "Getting Started Guide" });
    await guideLink.click();
    await expect(page).toHaveURL(/\/guides\/getting-started/);
  });
});
