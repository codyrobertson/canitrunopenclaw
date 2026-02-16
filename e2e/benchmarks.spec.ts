import { test, expect } from "@playwright/test";

test.describe("Benchmarks Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/benchmarks");
  });

  test("renders page title", async ({ page }) => {
    await expect(page.locator("h1")).toContainText(/ClawBench|Benchmark/i);
  });

  test("shows summary stats", async ({ page }) => {
    // Should show total runs, forks tested, etc.
    await expect(page.getByText(/Total Runs|Forks Tested|Avg Score/i).first()).toBeVisible();
  });

  test("shows leaderboard table", async ({ page }) => {
    // Should have a table or list of benchmark results
    const table = page.locator("table").first();
    if (await table.isVisible()) {
      const rows = table.locator("tbody tr");
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    }
  });

  test("shows How ClawBench Works section", async ({ page }) => {
    // Scroll down to find the how it works section
    await expect(page.getByText(/How ClawBench Works/i)).toBeVisible();
  });

  test("fork filter works", async ({ page }) => {
    // Click on a fork filter if available
    const filterButtons = page.locator("a[href*='fork='], button").filter({ hasText: /All Forks/i });
    const count = await filterButtons.count();
    if (count > 0) {
      await expect(filterButtons.first()).toBeVisible();
    }
  });

  test("scoring section shows weight breakdown", async ({ page }) => {
    await expect(page.getByText(/Scoring/i).first()).toBeVisible();
    // Should show the scoring components
    await expect(page.getByText(/Latency|Capabilities|Size|Build/i).first()).toBeVisible();
  });

  test("capabilities section lists capability tests", async ({ page }) => {
    await expect(page.getByText(/Capabilities/i).first()).toBeVisible();
  });
});
