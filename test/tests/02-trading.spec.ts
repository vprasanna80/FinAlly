import { expect, test, type Page } from "@playwright/test";

async function readCash(page: Page): Promise<number> {
  const text = await page
    .locator("header")
    .getByText("Cash", { exact: true })
    .locator("..")
    .locator("div.font-mono")
    .innerText();
  return Number(text.replace(/[^0-9.-]/g, ""));
}

test("buying and selling shares updates cash and positions", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible();

  const cashBefore = await readCash(page);

  await page.getByLabel("Trade ticker").fill("AAPL");
  await page.getByLabel("Trade quantity").fill("2");
  await page.getByRole("button", { name: "Buy", exact: true }).click();

  await expect(page.getByTestId("position-AAPL")).toBeVisible({ timeout: 10_000 });
  await expect
    .poll(() => readCash(page), { timeout: 10_000 })
    .toBeLessThan(cashBefore);

  await page.getByLabel("Trade ticker").fill("AAPL");
  await page.getByLabel("Trade quantity").fill("2");
  await page.getByRole("button", { name: "Sell", exact: true }).click();

  await expect(page.getByTestId("position-AAPL")).toHaveCount(0, { timeout: 10_000 });
});
