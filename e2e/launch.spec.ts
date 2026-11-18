import { expect, test, type Page } from "@playwright/test";

const widths = [320, 375, 768, 1280, 1440];
const pages = [
  { name: "home", path: "/", heading: "Move full truckloads across Nigeria." },
  { name: "waitlist", path: "/waitlist?role=owner&phone=8031234567", heading: "Join the waitlist" },
  { name: "privacy", path: "/legal/privacy", heading: "Privacy notice" },
  { name: "terms", path: "/legal/terms", heading: "Waitlist terms" },
  { name: "not-found", path: "/no-such-page", heading: "We can't find that page." },
];

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("404")) errors.push(message.text());
  });
  return errors;
}

// Scrolls to the bottom and back so lazy images load before a full-page capture.
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 40));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForLoadState("networkidle");
  await page.waitForTimeout(300);
}

// Reduced motion shows every animated section in its finished state, so full-page captures are stable.
test.use({ colorScheme: "light", reducedMotion: "reduce" });

for (const { name, path, heading } of pages) {
  for (const width of widths) {
    test(`${name} at ${width}px`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto(path, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      await scrollThrough(page);
      await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, "no sideways scrolling").toBeLessThanOrEqual(0);
      expect(errors).toEqual([]);
      await expect(page).toHaveScreenshot(`${name}-${width}.png`, { fullPage: true });
    });
  }
}

test("waitlist shows every missing field", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/waitlist?role=owner", { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "Join the waitlist" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Check the highlighted fields." })).toBeVisible();
  await expect(page.getByText("Enter your full name")).toBeVisible();
  await expect(page.getByText("Enter a Nigerian mobile number, like 0803 123 4567")).toBeVisible();
  await expect(page.getByText("Enter a number of trucks from 1 to 1000")).toBeVisible();
  await expect(page.getByText("Tick the box to join the waitlist")).toBeVisible();
  await expect(page.getByLabel("Full name")).toBeFocused();
  await expect(page).toHaveScreenshot("waitlist-errors-375.png", { fullPage: true });
});

test("the hero bar checks the number, then carries the role, route and number to the waitlist", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/", { waitUntil: "networkidle" });
  await page.getByRole("radio", { name: "I own trucks" }).check({ force: true });
  await page.getByLabel("Your route").selectOption("lagos-abuja");
  await page.locator("#hero-phone").fill("12345");
  await page.getByRole("button", { name: /Join the waitlist/ }).last().click();
  await expect(page.getByText("Enter a Nigerian mobile number, like 0803 123 4567")).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.locator("#hero-phone").fill("08031234567");
  await page.getByRole("button", { name: /Join the waitlist/ }).last().click();
  await expect(page).toHaveURL(/\/waitlist\?role=owner&corridors=lagos-abuja&phone=803\+123\+4567/);
  await expect(page.getByRole("radio", { name: "A truck owner" })).toHaveAttribute("aria-checked", "true");
  await expect(page.getByLabel("WhatsApp number")).toHaveValue("803 123 4567");
  await expect(page.getByRole("button", { name: /Lagos.*Abuja/ })).toHaveAttribute("aria-pressed", "true");
});
