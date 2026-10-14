import { expect, type Page } from "@playwright/test";

export const DEMO_PASSWORD = "demo1234";

/** Signs in through the form as a demo user (e.g. "owner@demo.test") and waits for the landing page. */
export async function signIn(page: Page, email: string, landing: RegExp = /\/dashboard$/) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(DEMO_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(landing);
}
