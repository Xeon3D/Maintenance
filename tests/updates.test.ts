import { describe, expect, it, vi } from "vitest";
import { encodeNotes, noteLines } from "../scripts/release-notes.mjs";

vi.mock("server-only", () => ({}));

const { decodeNotes, hubRepository, releasesFromTags } = await import("@/lib/updates");

describe("image repository", () => {
  it("strips the registry and the tag", () => {
    expect(hubRepository("malvesdc/maintenance")).toBe("malvesdc/maintenance");
    expect(hubRepository("docker.io/malvesdc/maintenance:latest")).toBe("malvesdc/maintenance");
    expect(hubRepository("postgres")).toBe("library/postgres");
  });
});

describe("releases from Docker Hub tags", () => {
  it("keeps version tags only, newest first", () => {
    const releases = releasesFromTags("malvesdc/maintenance", [
      { name: "latest", tag_last_pushed: "2026-10-22T13:45:48Z" },
      { name: "0.4.9", tag_last_pushed: "2026-10-01T10:00:00Z" },
      { name: "0.4.12", tag_last_pushed: "2026-10-22T13:45:48Z" },
      { name: "0.5.0-rc1" },
    ]);
    expect(releases.map((r) => r.version)).toEqual(["0.4.12", "0.4.9"]);
    expect(releases[0]).toEqual({
      version: "0.4.12",
      url: "https://hub.docker.com/r/malvesdc/maintenance/tags?name=0.4.12",
      notes: [],
      publishedAt: "2026-10-22T13:45:48Z",
    });
  });
});

describe("release notes", () => {
  const body = [
    "## What's Changed",
    "* Roles: a permissions page per role by @malves-dc in https://github.com/malves-dc/Maintenance/pull/37",
    "* Knowledge editor <b>bold</b> in https://github.com/malves-dc/Maintenance/pull/36",
    "",
    "## New Contributors",
    "* @someone made their first contribution in https://github.com/malves-dc/Maintenance/pull/35",
    "",
    "**Full Changelog**: https://github.com/malves-dc/Maintenance/compare/v0.4.11...v0.4.12",
  ].join("\r\n");
  const titles = ["Roles: a permissions page per role", "Knowledge editor <b>bold</b>"];

  it("takes the titles from a GitHub release body", () => {
    expect(noteLines(body)).toEqual(titles);
  });

  it("round-trips through the image annotation", () => {
    expect(decodeNotes(encodeNotes(noteLines(body)))).toEqual(titles);
  });

  it("reads a missing or malformed annotation as no notes", () => {
    expect(decodeNotes(undefined)).toEqual([]);
    expect(decodeNotes("not base64 json")).toEqual([]);
    expect(decodeNotes(Buffer.from('{"a":1}').toString("base64"))).toEqual([]);
    expect(decodeNotes(Buffer.from('["ok", 3, " "]').toString("base64"))).toEqual(["ok"]);
  });
});
