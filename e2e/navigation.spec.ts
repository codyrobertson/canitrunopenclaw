import { test, expect } from "@playwright/test";

test.describe("Navigation", () => {
  test("nav links navigate to correct pages", async ({ page }) => {
    await page.goto("/");

    // Devices
    await page.locator("nav").getByRole("link", { name: "Devices" }).click();
    await expect(page).toHaveURL(/\/devices/);
    await expect(page.locator("h1")).toContainText(/Devices/i);

    // Forks
    await page.locator("nav").getByRole("link", { name: "Forks" }).click();
    await expect(page).toHaveURL(/\/forks/);
    await expect(page.locator("h1")).toContainText(/Forks/i);

    // Compare
    await page.locator("nav").getByRole("link", { name: "Compare" }).click();
    await expect(page).toHaveURL(/\/compare/);

    // Benchmarks
    await page.locator("nav").getByRole("link", { name: "Benchmarks" }).click();
    await expect(page).toHaveURL(/\/benchmarks/);
    await expect(page.locator("h1")).toContainText(/ClawBench|Benchmark/i);
  });

  test("logo links back to homepage", async ({ page }) => {
    await page.goto("/devices");
    await page.locator("nav").getByRole("link", { name: /Can it run OpenClaw/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("nav is sticky on scroll", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => window.scrollBy(0, 500));
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
    const box = await nav.boundingBox();
    expect(box?.y).toBe(0);
  });
});

test.describe("Navigation - Mobile", () => {
  test.use({ viewport: { width: 375, height: 812 } });

  test("desktop nav links are hidden on mobile", async ({ page }) => {
    await page.goto("/");
    // The md:flex links should be hidden
    const desktopLinks = page.locator("nav .hidden.md\\:flex");
    await expect(desktopLinks).toBeHidden();
  });

  test("mobile menu button is visible", async ({ page }) => {
    await page.goto("/");
    const menuButton = page.locator("nav button").first();
    await expect(menuButton).toBeVisible();
  });

  test("mobile menu opens and shows nav links", async ({ page }) => {
    await page.goto("/");
    // Click mobile menu button
    const menuButton = page.locator("nav button").first();
    await menuButton.click();

    // Should show links
    await expect(page.getByRole("link", { name: "Devices" }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: "Forks" }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: "Compare" }).last()).toBeVisible();
    await expect(page.getByRole("link", { name: "Benchmarks" }).last()).toBeVisible();
  });
});
