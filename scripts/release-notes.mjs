// Turns a GitHub release body ("* Title by @user in https://…/pull/N" lines) into the value of the
// io.villaops.release-notes image annotation: base64 of a JSON array of the titles, which installed
// servers read from Docker Hub (src/lib/updates.ts). Used by .github/workflows/release.yml.
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function noteLines(markdown) {
  const md = markdown.split(/\r?\n/);
  // GitHub's "New Contributors" list and the "Full Changelog" link aren't release notes.
  const end = md.findIndex((l) => /^#+\s*New Contributors|^\*\*Full Changelog/.test(l));
  return (end < 0 ? md : md.slice(0, end))
    .map((l) => l.match(/^\s*[*-]\s+(.+?)(?:\s+by\s+@\S+)?(?:\s+in\s+https?:\/\/\S+)?\s*$/)?.[1])
    .filter(Boolean)
    .slice(0, 50);
}

export const encodeNotes = (lines) => Buffer.from(JSON.stringify(lines)).toString("base64");

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  process.stdout.write(encodeNotes(noteLines(readFileSync(process.argv[2], "utf8"))));
}
