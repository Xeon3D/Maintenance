import { expect, test, type APIRequestContext } from "@playwright/test";
import { signIn } from "./helpers";

test.describe("roles", () => {
  test("a viewer can see work orders but not create them", async ({ page }) => {
    await signIn(page, "viewer@demo.test");
    expect((await page.goto("/work-orders"))?.status()).toBe(200);
    expect((await page.goto("/work-orders/new"))?.status()).toBe(404);
  });

  test("a manager can't open the server administration", async ({ page }) => {
    await signIn(page, "manager@demo.test");
    expect((await page.goto("/settings/server"))?.status()).toBe(404);
  });
});

test.describe("public paths", () => {
  test("only the listed public routes skip sign-in, not longer names", async ({ request }) => {
    for (const path of ["/privacy-x", "/loginx", "/dashboardpng"]) {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status(), path).toBe(307);
      expect(res.headers()["location"], path).toContain("/login?next=");
    }
  });
});

test.describe("sign-in limit", () => {
  // Sent as if through a proxy of its own (one per run, so a retry starts clean); other tests come from 127.0.0.1.
  const proxy = `198.51.100.${Date.now() % 250}`;

  async function attempt(request: APIRequestContext, forged: string, email: string) {
    const { csrfToken } = await (await request.get("/api/auth/csrf")).json();
    const res = await request.post("/api/auth/callback/credentials", {
      form: { csrfToken, email, password: "wrong-password" },
      headers: { "X-Forwarded-For": `${forged}, ${proxy}` },
      maxRedirects: 0,
    });
    return res.headers()["location"] ?? "";
  }

  test("can't be dodged by forging X-Forwarded-For", async ({ request }) => {
    const run = Date.now();
    for (let i = 0; i < 30; i++) {
      expect(await attempt(request, `10.66.${i}.1`, `nobody${i}.${run}@limit.test`)).toContain("code=credentials");
    }
    // A new forged address and a new account: still the same proxy-seen address, so blocked.
    expect(await attempt(request, "10.99.9.9", `fresh.${run}@limit.test`)).toContain("code=too_many_attempts");
  });
});
