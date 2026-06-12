import { test, expect } from "@playwright/test";

test("React host renders a React remote via <RemoteComponent>, sharing one React", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(m.text());
  });

  await page.goto("/");

  // The remote React component renders inside the host's React tree.
  await expect(page.getByText("Counter (React remote)")).toBeVisible({ timeout: 15000 });

  // The remote uses useState. If React were not shared, this would throw "Invalid hook
  // call" instead of rendering. Clicking proves the hook works across the boundary.
  await expect(page.getByTestId("count")).toHaveText("count: 0");
  await page.getByTestId("increment").click();
  await page.getByTestId("increment").click();
  await expect(page.getByTestId("count")).toHaveText("count: 2");

  // No dual-React / invalid-hook errors.
  const joined = errors.join("\n");
  expect(joined).not.toMatch(/Invalid hook call/i);
  expect(joined).not.toMatch(/more than one copy of React/i);
});
