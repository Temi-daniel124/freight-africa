import { expect, test } from "@playwright/test";

for (const width of [375, 768, 1280, 1440]) {
  test(`component gallery at ${width}px`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
    });
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/dev/components", { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    await expect(page.getByRole("heading", { level: 1, name: "Components" })).toBeVisible();
    expect(errors).toEqual([]);
    await expect(page).toHaveScreenshot(`gallery-${width}.png`, { fullPage: true });
  });
}
