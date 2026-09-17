import { expect, test } from "@playwright/test";

test("portfolio heatmap and P&L chart render after trades", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("watchlist-row-MSFT")).toBeVisible();

  // Two trades so the P&L chart has at least two snapshots to draw a line between.
  await page.getByLabel("Trade ticker").fill("MSFT");
  await page.getByLabel("Trade quantity").fill("3");
  await page.getByRole("button", { name: "Buy", exact: true }).click();
  await expect(page.getByTestId("position-MSFT")).toBeVisible({ timeout: 10_000 });

  await page.getByLabel("Trade ticker").fill("MSFT");
  await page.getByLabel("Trade quantity").fill("1");
  await page.getByRole("button", { name: "Sell", exact: true }).click();
  await expect(page.getByTestId("position-MSFT")).toContainText("2", { timeout: 10_000 });

  const heatmap = page.getByText("Portfolio Heatmap").locator("..");
  await expect(heatmap.locator("svg rect").first()).toBeVisible({ timeout: 10_000 });

  const pnlChart = page.getByText("Portfolio Value").locator("..");
  await expect(pnlChart.locator("svg .recharts-line-curve")).toBeVisible({ timeout: 10_000 });
});
