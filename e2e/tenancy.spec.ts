import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

// Signs up a second company, which changes how the server behaves from then on (e.g. /privacy only resolves on a
// single-company server), so playwright.config.ts runs this file after all the others.
test.describe("tenancy", () => {
  test("another company can't open this company's work order", async ({ page, browser }) => {
    await signIn(page, "owner@demo.test");
    const title = `E2E tenancy check ${Date.now()}`;
    await page.goto("/work-orders/new");
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/work-orders\/c[a-z0-9]+$/);
    const url = new URL(page.url()).pathname;

    // A stranger signs up their own company (sign-up is open by default) and tries the link.
    const other = await browser.newContext();
    const stranger = await other.newPage();
    await stranger.goto("/signup");
    await stranger.getByLabel("Company name").fill("E2E Other Company");
    await stranger.getByLabel("Your name").fill("Eve Other");
    await stranger.getByLabel("Email").fill(`eve.${Date.now()}@other.test`);
    await stranger.locator('input[name="password"]').fill("other-company-pw"); // its label also holds the hint
    await stranger.getByRole("button", { name: "Create account" }).click();
    await expect(stranger).toHaveURL(/\/dashboard$/);

    const res = await stranger.goto(url);
    expect(res?.status()).toBe(404);
    await expect(stranger.getByText(title)).toHaveCount(0);
    await other.close();
  });
});
