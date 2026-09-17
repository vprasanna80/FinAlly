import { expect, test } from "@playwright/test";

test("SSE stream reconnects after a disconnect", async ({ page }) => {
  await page.goto("/");

  const dot = page.getByTestId("connection-status").locator("span").first();
  await expect(dot).toHaveClass(/bg-up/, { timeout: 10_000 });

  // Force the stream to fail so the client enters its reconnect path, then
  // let it succeed again and verify the indicator recovers.
  await page.route("**/api/stream/prices", (route) => route.abort());
  await page.reload();

  await expect(dot).not.toHaveClass(/bg-up/, { timeout: 15_000 });

  await page.unroute("**/api/stream/prices");
  await expect(dot).toHaveClass(/bg-up/, { timeout: 20_000 });
});
