import { expect, test } from "@playwright/test";

test("AI chat (mocked) responds and executes a trade inline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByTestId("watchlist-row-NVDA")).toBeVisible();

  const chatInput = page.getByLabel("Chat message");
  await chatInput.fill("buy 1 share of NVDA");
  await page.getByRole("button", { name: "Send" }).click();

  await expect(page.getByText("buy 1 share of NVDA")).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("chat-loading")).toHaveCount(0, { timeout: 15_000 });

  await expect(page.getByText(/Buying 1 shares? of NVDA/i)).toBeVisible();
  await expect(page.getByText(/Bought 1 NVDA/)).toBeVisible();

  await expect(page.getByTestId("position-NVDA")).toBeVisible({ timeout: 10_000 });
});
