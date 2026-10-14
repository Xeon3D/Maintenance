import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("signed out", () => {
  test("sign-in rejects a wrong password", async ({ page }) => {
    await page.goto("/login");
    await page.getByLabel("Email").fill("viewer@demo.test");
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page.getByText("Invalid email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/); // the password never ends up in the URL
    expect(page.url()).not.toContain("password");
  });

  test("privacy notice is public and linked from sign-in", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Privacy notice" }).click();
    await expect(page).toHaveURL(/\/privacy\/[a-z0-9-]+$/);
    await expect(page.getByRole("heading", { name: "Privacy notice" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Your rights" })).toBeVisible();
  });

  test("responses carry the security headers", async ({ request }) => {
    const res = await request.get("/login");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("protected pages redirect to sign-in", async ({ page }) => {
    await page.goto("/work-orders");
    await expect(page).toHaveURL(/\/login\?next=%2Fwork-orders/);
  });
});

test.describe("staff", () => {
  test("creates a work order and finds it in the list", async ({ page }) => {
    await signIn(page, "owner@demo.test");
    const title = `E2E router check ${Date.now()}`;
    await page.goto("/work-orders/new");
    await page.getByLabel("Title").fill(title);
    await page.getByRole("button", { name: "Create" }).click();
    await expect(page).toHaveURL(/\/work-orders\/c[a-z0-9]+$/);
    await expect(page.getByRole("heading", { name: title })).toBeVisible();

    await page.goto(`/work-orders?q=${encodeURIComponent(title)}`);
    await expect(page.getByRole("link", { name: new RegExp(title) })).toBeVisible();
  });

  test("profile offers the personal data download", async ({ page }) => {
    await signIn(page, "manager@demo.test");
    await page.goto("/settings/profile");
    const link = page.getByRole("link", { name: "Download my data" });
    await expect(link).toBeVisible();
    const res = await page.request.get((await link.getAttribute("href"))!);
    expect(res.ok()).toBe(true);
    const data = await res.json();
    expect(data.user.email).toBe("manager@demo.test");
    expect(JSON.stringify(data)).not.toContain("passwordHash");
  });
});

test.describe("client portal", () => {
  test("a client lands on the portal, not the staff app", async ({ page }) => {
    await signIn(page, "client@demo.test", /\/(dashboard|portal)/);
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/portal/);
    await expect(page.getByRole("link", { name: "Privacy notice" })).toBeVisible();
  });
});

test.describe("session", () => {
  // Regression: responses to link prefetches still in flight during sign-out used to re-issue the old
  // session cookie, so the previous user stayed signed in (or came back after signing in as someone else).
  test("signing out right after a page opens really signs out, and the next user stays signed in", async ({ page }) => {
    await signIn(page, "tech.network@demo.test");
    await page.goto("/work-orders");
    await page.getByTitle("Sign out").first().click(); // while the sidebar links are still prefetching
    await expect(page).toHaveURL(/\/login/);
    await page.waitForTimeout(1500);
    // Signed out: the proxy sends the API request to the sign-in page.
    const after = await page.request.get("/api/account/export", { maxRedirects: 0 });
    expect(after.status()).toBe(307);
    expect(after.headers()["location"]).toContain("/login");

    await signIn(page, "manager@demo.test");
    for (const p of ["/work-orders", "/assets", "/dashboard"]) await page.goto(p);
    await page.reload();
    expect((await (await page.request.get("/api/account/export")).json()).user.email).toBe("manager@demo.test");
  });
});
