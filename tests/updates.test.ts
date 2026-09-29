import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const { cleanReleaseHtml } = await import("@/lib/updates");

describe("release notes html", () => {
  it("keeps formatting and opens links in a new tab", () => {
    expect(cleanReleaseHtml('<h2>New</h2><ul><li><strong>Backups</strong> <a href="https://x.test">docs</a></li></ul>')).toBe(
      '<h2>New</h2><ul><li><strong>Backups</strong> <a target="_blank" rel="noreferrer noopener" href="https://x.test">docs</a></li></ul>',
    );
  });

  it("strips anything active", () => {
    const out = cleanReleaseHtml(
      '<p onclick="x()">a</p><script>alert(1)</script><iframe src="https://e.test"></iframe><a href="javascript:alert(1)">b</a><img src=x onerror=alert(1)>',
    );
    expect(out).not.toMatch(/script|iframe|onclick|onerror|javascript:/i);
    expect(out).toContain("<p>a</p>");
  });
});
