import { test, expect } from "@playwright/test";

test.describe("Homepage", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("renders hero section with title", async ({ page }) => {
    await expect(page.locator("h1")).toContainText("Can it run");
    await expect(page.locator("h1")).toContainText("OpenClaw");
  });

  test("shows navigation with all links", async ({ page }) => {
    const nav = page.locator("nav");
    await expect(nav).toBeVisible();
    await expect(nav.getByRole("link", { name: "Devices" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Forks" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Compare" })).toBeVisible();
    await expect(nav.getByRole("link", { name: "Benchmarks" })).toBeVisible();
  });

  test("shows top devices section with device cards", async ({ page }) => {
    await expect(page.getByText("Top-Rated Devices")).toBeVisible();
    const deviceCards = page.locator("a[href^='/devices/']").first();
    await expect(deviceCards).toBeVisible();
  });

  test("shows forks section", async ({ page }) => {
    await expect(page.getByText("OpenClaw Forks")).toBeVisible();
    const forkCards = page.locator("a[href^='/forks/']").first();
    await expect(forkCards).toBeVisible();
  });

  test("hero CTA links work", async ({ page }) => {
    const browseLink = page.getByRole("link", { name: /Browse.*Devices/i }).first();
    await expect(browseLink).toBeVisible();
    await browseLink.click();
    await expect(page).toHaveURL(/\/devices/);
  });

  test("has search bar", async ({ page }) => {
    const search = page.getByPlaceholder(/search/i).first();
    await expect(search).toBeVisible();
  });

  test("footer renders with links", async ({ page }) => {
    const footer = page.locator("footer");
    await expect(footer).toBeVisible();
    await expect(footer.getByText("By Category")).toBeVisible();
    await expect(footer.getByText("Popular Devices")).toBeVisible();
    await expect(footer.getByText("Resources")).toBeVisible();
    await expect(footer.getByRole("link", { name: "GitHub" })).toHaveAttribute(
      "href",
      /github\.com\/codyrobertson/
    );
  });

  test("page has correct meta title", async ({ page }) => {
    const title = await page.title();
    expect(title).toContain("OpenClaw");
  });
});
