import { test, expect } from "@playwright/test";

test.describe("Error Pages", () => {
  test("404 page renders for unknown routes", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist-12345");
    expect(response?.status()).toBe(404);

    await expect(page.getByText("404")).toBeVisible();
    await expect(page.getByText("Page not found")).toBeVisible();
  });

  test("404 page has navigation links", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-12345");

    const homeLink = page.getByRole("link", { name: /Back to Home/i });
    await expect(homeLink).toBeVisible();

    const devicesLink = page.getByRole("link", { name: /Browse Devices/i });
    await expect(devicesLink).toBeVisible();
  });

  test("404 home link works", async ({ page }) => {
    await page.goto("/this-page-does-not-exist-12345");
    await page.getByRole("link", { name: /Back to Home/i }).click();
    await expect(page).toHaveURL("/");
  });

  test("invalid device slug shows 404", async ({ page }) => {
    const response = await page.goto("/devices/this-device-does-not-exist-xyz");
    expect(response?.status()).toBe(404);
  });

  test("invalid fork slug shows 404", async ({ page }) => {
    const response = await page.goto("/forks/this-fork-does-not-exist-xyz");
    expect(response?.status()).toBe(404);
  });
});
