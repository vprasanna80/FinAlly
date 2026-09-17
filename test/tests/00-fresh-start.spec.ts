import { expect, test } from "@playwright/test";

const DEFAULT_TICKERS = [
  "AAPL",
  "GOOGL",
  "MSFT",
  "AMZN",
  "TSLA",
  "NVDA",
  "META",
  "JPM",
  "V",
  "NFLX",
];

test("fresh start shows the default watchlist, $10k cash, and streaming prices", async ({ page }) => {
  await page.goto("/");

  for (const ticker of DEFAULT_TICKERS) {
    await expect(page.getByTestId(`watchlist-row-${ticker}`)).toBeVisible();
  }

  await expect(page.getByText("$10,000.00").first()).toBeVisible();

  await expect(page.getByTestId("connection-status")).toBeVisible();
  const dot = page.getByTestId("connection-status").locator("span").first();
  await expect(dot).toHaveClass(/bg-up/, { timeout: 10_000 });

  const sparkline = page.getByTestId("watchlist-row-AAPL").getByTestId("sparkline");
  await expect(sparkline.locator("polyline")).toHaveCount(1, { timeout: 5_000 });
});
