import { expect, test } from "@playwright/test";

test("adding and removing a ticker from the watchlist", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("watchlist-row-AAPL")).toBeVisible();

  await page.getByLabel("Add ticker to watchlist").fill("pypl");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByTestId("watchlist-row-PYPL")).toBeVisible({ timeout: 10_000 });

  await page.getByLabel("Remove PYPL").click();
  await expect(page.getByTestId("watchlist-row-PYPL")).toHaveCount(0, { timeout: 10_000 });
});
