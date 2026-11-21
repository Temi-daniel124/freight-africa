import { expect, test } from "@playwright/test";

// Slice 4 screens: the invite page (A-07) and the Team screen (S-20). The database rules behind them are
// proved by supabase/tests/040_organizations.test.sql.
test.use({ colorScheme: "light", reducedMotion: "reduce" });

test("a made-up invite link says it can't be found, without signing in", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("/invite/not-a-real-token", { waitUntil: "networkidle" });
  await expect(page.getByRole("heading", { name: "We can't find this invite" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Go to home" })).toBeVisible();
});

test("the invite preview shows every state", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("/dev/invite", { waitUntil: "networkidle" });
  await expect(page.getByText("Musa invited you to join Musa Transport on Freight Africa as driver.")).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in to accept" })).toHaveAttribute("href", "/auth?next=%2Finvite%2Fpreview");
  await expect(page.getByRole("button", { name: "Accept and continue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This invite has expired" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "This invite has already been used" })).toBeVisible();
});

test("the team screen lists people, open invites, and opens the invite sheet", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto("/dev/team", { waitUntil: "networkidle" });
  for (const name of ["Adaeze Okafor", "Tunde Bakare", "Chioma Eze", "Femi Adeyemi"]) await expect(page.locator("main").getByText(name)).toBeVisible();
  await expect(page.getByText("+234 805 555 0101")).toBeVisible();
  await page.getByRole("button", { name: "Invite someone" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByLabel("Phone number or email")).toBeVisible();
  for (const role of ["Admin", "Booker", "Finance", "Viewer"]) await expect(sheet.getByRole("radio", { name: new RegExp(role) })).toBeVisible();
  await expect(sheet.getByRole("radio", { name: /Booker/ })).toBeChecked();
});
