import { expect, test } from "@playwright/test";

const widths = [320, 375, 768, 1280, 1440];

// A code "on its way", as the server would have recorded it, so the code screen can be opened without
// sending a real email. The address is an example, never a real person.
const pending = { channel: "email", to: "ngozi.okafor@example.com", next: "/app", length: 6 };

for (const width of widths) {
  test(`sign-in at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/auth", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1, name: "Welcome to Freight Africa" })).toBeVisible();
    await expect(page).toHaveScreenshot(`sign-in-${width}.png`, { fullPage: true });
  });

  test(`enter code at ${width}px`, async ({ page, context, baseURL }) => {
    await context.addCookies([{ name: "fa_auth_pending", value: JSON.stringify(pending), url: `${baseURL}/auth` }]);
    // The clock is held still so "Resend code in 30 s" doesn't change between runs.
    await page.clock.install();
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/auth/code", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1, name: "Enter your code" })).toBeVisible();
    await page.getByLabel("6-digit code").fill("482");
    await expect(page).toHaveScreenshot(`enter-code-${width}.png`, { fullPage: true });
  });
}

test("sign-in refuses an address that isn't an email", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/auth", { waitUntil: "networkidle" });
  await page.getByLabel("Email address").fill("ngozi@");
  await page.getByRole("button", { name: "Send code by email" }).click();
  await expect(page.getByText("Enter a valid email address, like ngozi@example.com")).toBeVisible();
  await expect(page).toHaveURL(/\/auth$/);
  await expect(page).toHaveScreenshot("sign-in-invalid-375.png", { fullPage: true });
});

test("the code screen needs a code on its way", async ({ page }) => {
  await page.goto("/auth/code");
  await expect(page).toHaveURL(/\/auth$/);
});

test("the account page needs a session and returns there after sign-in", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/auth\?next=(%2F|\/)app$/);
});

test("a link that tries to leave the site after sign-in is ignored", async ({ page }) => {
  await page.goto("/auth?next=https://example.com/steal", { waitUntil: "networkidle" });
  await expect(page.locator('input[name="next"]').first()).toHaveValue("/app");
});
