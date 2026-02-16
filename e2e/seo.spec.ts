import { test, expect } from "@playwright/test";

test.describe("SEO & Meta Tags", () => {
  test("homepage has og tags", async ({ page }) => {
    await page.goto("/");
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /OpenClaw/);

    const ogDesc = page.locator('meta[property="og:description"]');
    await expect(ogDesc).toHaveAttribute("content", /.+/);

    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute("content", "website");
  });

  test("homepage has twitter card meta", async ({ page }) => {
    await page.goto("/");
    const twitterCard = page.locator('meta[name="twitter:card"]');
    await expect(twitterCard).toHaveAttribute("content", /summary/);
  });

  test("pages have unique titles", async ({ page }) => {
    const titles: string[] = [];

    for (const path of ["/", "/devices", "/forks", "/benchmarks", "/compare"]) {
      await page.goto(path);
      const title = await page.title();
      titles.push(title);
    }

    // All titles should be unique
    const unique = new Set(titles);
    expect(unique.size).toBe(titles.length);
  });

  test("device detail page has structured data", async ({ page }) => {
    await page.goto("/devices");
    const firstCard = page.locator("a[href^='/devices/']").first();
    await firstCard.click();

    const jsonLd = page.locator('script[type="application/ld+json"]');
    const count = await jsonLd.count();
    expect(count).toBeGreaterThan(0);

    const content = await jsonLd.first().textContent();
    const data = JSON.parse(content!);
    expect(data).toBeDefined();
  });

  test("canonical URL is set", async ({ page }) => {
    await page.goto("/devices");
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /\/devices/);
  });

  test("RSS feed link is in head", async ({ page }) => {
    await page.goto("/");
    const rss = page.locator('link[type="application/rss+xml"]');
    await expect(rss).toHaveAttribute("href", /feed\.xml/);
  });
});

test.describe("Sitemap & Robots", () => {
  test("robots.txt is accessible", async ({ page }) => {
    const response = await page.goto("/robots.txt");
    expect(response?.status()).toBe(200);
    const text = await response?.text();
    expect(text).toContain("User-Agent");
    expect(text).toContain("Sitemap");
  });

  test("sitemap.xml is accessible", async ({ page }) => {
    const response = await page.goto("/sitemap.xml");
    expect(response?.status()).toBe(200);
    const text = await response?.text();
    expect(text).toContain("urlset");
  });

  test("RSS feed is accessible", async ({ page }) => {
    const response = await page.goto("/feed.xml");
    expect(response?.status()).toBe(200);
    const text = await response?.text();
    expect(text).toContain("rss");
  });
});
