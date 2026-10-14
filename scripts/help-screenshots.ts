// Captures the screenshots used by the in-app help (public/help-shots/<locale>/<name>.png), in both
// languages, from a running server with the demo company seeded. Each article declares its shots in
// src/content/help/<slug>.ts (`shots`).
//
// Usage:  npx tsx scripts/help-screenshots.ts [slug-or-shot-name …]
// Env:    HELP_BASE_URL (default http://localhost:3000), HELP_HOST_RULES (Chromium host-resolver rules), HELP_USER (default owner@demo.test), HELP_PASSWORD (default demo1234)
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { chromium, type Browser, type Page } from "@playwright/test";
import { HELP_CONTENT } from "../src/content/help";
import { LOCALES, LOCALE_COOKIE, INTL_LOCALE, type Locale } from "../src/i18n/config";
import type { HelpShot } from "../src/lib/help";

const BASE = process.env.HELP_BASE_URL ?? "http://localhost:3000";
const USER = process.env.HELP_USER ?? "owner@demo.test";
const PASSWORD = process.env.HELP_PASSWORD ?? "demo1234";
const WIDTH = 1280;

const only = process.argv.slice(2);
const shots: HelpShot[] = Object.entries(HELP_CONTENT).flatMap(([slug, mod]) =>
  mod.shots.filter((s) => !only.length || only.includes(slug) || only.includes(s.name)),
);

async function signIn(browser: Browser, locale: Locale): Promise<Page> {
  const context = await browser.newContext({ viewport: { width: WIDTH, height: 900 }, colorScheme: "light", locale: INTL_LOCALE[locale], timezoneId: "Europe/Lisbon" }); // the demo company's zone
  await context.addCookies([{ name: LOCALE_COOKIE, value: locale, url: BASE }]);
  const page = await context.newPage();
  await page.goto(`${BASE}/login`);
  await page.fill('input[name="email"]', USER);
  await page.fill('input[name="password"]', PASSWORD);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60_000 }), page.press('input[name="password"]', "Enter")]);
  return page;
}

async function capture(page: Page, shot: HelpShot, file: string) {
  await page.setViewportSize({ width: shot.width ?? WIDTH, height: 900 });
  await page.goto(BASE + shot.path, { waitUntil: "load", timeout: 120_000 });
  if (shot.open) {
    const from = page.url();
    await page.locator("main a").filter({ hasText: shot.open }).first().click();
    await page.waitForURL((u) => u.href !== from, { timeout: 120_000 }); // client-side navigation
    await page.waitForLoadState("load");
  }
  // Light theme, no dev-only overlays, no caret or focus rings.
  await page.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  await page.addStyleTag({ content: "nextjs-portal{display:none!important} *{caret-color:transparent!important} :focus{outline:none!important}" });
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.waitForTimeout(600);

  // Default: the content column inside <main> (main itself starts under the fixed menu).
  const el = page.locator(shot.selector ?? "main > div").first();
  await el.waitFor({ state: "visible", timeout: 30_000 });
  const box = await el.boundingBox();
  if (!box) throw new Error(`${shot.name}: element not found`);
  const scrollY = await page.evaluate(() => window.scrollY);
  await page.screenshot({
    path: file,
    fullPage: true,
    clip: { x: box.x, y: box.y + scrollY, width: box.width, height: Math.min(box.height, shot.maxHeight ?? 760) },
  });
}

async function main() {
  if (!shots.length) throw new Error(`No shots match ${only.join(", ")}`);
  // HELP_HOST_RULES lets a browser in another container reach the server as localhost (next dev only
  // hydrates for its own origin), e.g. "MAP localhost:3300 host.docker.internal:3300".
  const rules = process.env.HELP_HOST_RULES;
  const browser = await chromium.launch({ args: rules ? [`--host-resolver-rules=${rules}`] : [] });
  let failed = 0;
  try {
    for (const locale of LOCALES) {
      const dir = join("public", "help-shots", locale);
      mkdirSync(dir, { recursive: true });
      const page = await signIn(browser, locale);
      for (const shot of shots) {
        try {
          await capture(page, shot, join(dir, `${shot.name}.png`));
          console.log(`✓ ${locale}/${shot.name}`);
        } catch (e) {
          failed++;
          console.error(`✗ ${locale}/${shot.name}: ${(e as Error).message.split("\n")[0]}`);
        }
      }
      await page.context().close();
    }
  } finally {
    await browser.close();
  }
  if (failed) process.exit(1);
}

main();
