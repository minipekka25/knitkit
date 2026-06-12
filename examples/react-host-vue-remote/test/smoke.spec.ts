import { test, expect } from "@playwright/test";

test("React host mounts Vue remote and proves singleton via shared-state", async ({ page }) => {
  // Capture console errors so the failure is debuggable.
  const errors: string[] = [];
  const logs: string[] = [];
  page.on("response", (r) => {
    if (r.status() >= 400) {
      errors.push(`HTTP ${r.status()} ${r.url()}`);
    }
  });
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (msg) => {
    const t = msg.type();
    const text = msg.text();
    logs.push(`[${t}] ${text}`);
    if (t === "error") errors.push(text);
  });

  await page.goto("/");
  await page.waitForTimeout(2000);
  console.log("--- console logs ---\n" + logs.join("\n"));
  console.log("--- errors ---\n" + errors.join("\n"));

  // The Vue remote's title appears in the rendered DOM.
  await expect(page.getByText("CartWidget (Vue 3 remote)")).toBeVisible({ timeout: 15000 });

  // The singleton proof: shared-state.touched must contain BOTH "host" and "vue-remote".
  const proof = await page.getByTestId("singleton-proof").textContent();
  expect(proof).toMatch(/host/);
  expect(proof).toMatch(/vue-remote/);

  await page.getByTestId("increment").click();
  await page.getByTestId("increment").click();
  await expect(page.getByTestId("count")).toHaveText("count: 2");

  expect(errors.join("\n")).not.toMatch(/Failed to load module/);
});

