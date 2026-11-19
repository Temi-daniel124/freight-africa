import { expect, test } from "@playwright/test";

// Gate 4: the app shell, on the preview-only /dev/home (the real shells need a session; auth.spec.ts
// checks they send signed-out people to sign-in).
test.use({ colorScheme: "light", reducedMotion: "reduce" });

test("phone: floating tabs, the greeting instead of a title on Home, nothing hidden behind the tabs", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("/dev/home", { waitUntil: "networkidle" });
  const tabs = page.getByRole("navigation", { name: "Main" }).last();
  const box = (await tabs.boundingBox())!;
  expect(Math.round(box.x)).toBe(12);
  expect(Math.round(375 - box.x - box.width)).toBe(12);
  expect(Math.round(844 - box.y - box.height)).toBe(12);
  expect(await tabs.evaluate((el) => getComputedStyle(el).borderRadius)).toBe("45px");
  await expect(tabs.getByRole("link")).toHaveText(["Home", "Trips", "Book", "Payments", "More"]);
  await expect(tabs.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
  // Home has no page title; the top bar greets the person.
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(0);
  await expect(page.getByText("Good morning").last()).toBeVisible();
  // Scrolled to the end, the last card ends above the tabs.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const last = await page.locator("main a:visible").last().boundingBox();
  const tabsTop = (await tabs.boundingBox())!.y;
  expect(last!.y + last!.height).toBeLessThanOrEqual(tabsTop);
});

test("desktop: sidebar with the main action, search, bell and account menu", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/home", { waitUntil: "networkidle" });
  const sidebar = page.locator("aside");
  await expect(sidebar.getByRole("link", { name: "Book a truck" })).toBeVisible();
  await expect(sidebar.getByRole("link", { name: "Home", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(page.getByRole("link", { name: /Notifications, 3 unread/ }).first()).toBeVisible();
  await page.getByRole("button", { name: /Okafor Foods Ltd/ }).click();
  await expect(page.getByRole("button", { name: "Sign out" }).first()).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Sign out" }).first()).toBeHidden();
});

test("each role gets its own tabs, and drivers get the bigger ones", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  const expected = {
    owner: ["Home", "Loads", "Trips", "Earnings", "More"],
    ownerDriver: ["Home", "Loads", "Drive", "Earnings", "More"],
    driver: ["Trip", "Next load", "History", "Me"],
    agent: ["Home", "People", "Invite", "Earnings", "Me"],
  };
  for (const [role, labels] of Object.entries(expected)) {
    await page.goto(`/dev/home?role=${role}`, { waitUntil: "networkidle" });
    const tabs = page.getByRole("navigation", { name: "Main" }).last();
    await expect(tabs.getByRole("link")).toHaveText(labels);
    const height = (await tabs.boundingBox())!.height;
    expect(Math.round(height), role).toBe(role === "driver" ? 72 : 68);
  }
});

test("the component gallery shows every Gate 4 component", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/dev/components", { waitUntil: "networkidle" });
  for (const heading of ["Buttons", "Fields", "Status chips", "Segmented control", "Feedback", "Bottom sheet"]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
  }
  await page.getByRole("radio", { name: "Unpaid" }).click();
  await expect(page.getByRole("radio", { name: "Unpaid" })).toHaveAttribute("aria-checked", "true");
});
