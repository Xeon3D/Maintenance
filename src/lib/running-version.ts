import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { APP_VERSION } from "@/lib/version";

// What the sidebar shows after the software name (Settings → Server → General): the release version, or on a
// dev server the checked-out commit. Read straight from .git (the dev container may have no git binary).

const read = (file: string) => readFile(file, "utf8").then((s) => s.trim());

async function gitCommit(): Promise<string | null> {
  try {
    let gitDir = path.join(process.cwd(), ".git");
    // A worktree's .git is a file pointing at its git dir; shared refs then live in the common dir.
    const pointer = await read(gitDir).catch(() => null);
    if (pointer?.startsWith("gitdir:")) gitDir = path.resolve(process.cwd(), pointer.slice(7).trim());
    const commonDir = await read(path.join(gitDir, "commondir"))
      .then((d) => path.resolve(gitDir, d))
      .catch(() => gitDir);
    const head = await read(path.join(gitDir, "HEAD"));
    if (!head.startsWith("ref:")) return head.slice(0, 8); // detached HEAD
    const ref = head.slice(4).trim();
    for (const dir of [gitDir, commonDir]) {
      const sha = await read(path.join(dir, ref)).catch(() => null);
      if (sha) return sha.slice(0, 8);
    }
    const packed = await read(path.join(commonDir, "packed-refs"));
    const line = packed.split("\n").find((l) => l.trim().endsWith(` ${ref}`));
    return line ? line.slice(0, 8) : null;
  } catch {
    return null;
  }
}

export async function runningVersion() {
  if (process.env.NODE_ENV !== "production") {
    const commit = await gitCommit();
    if (commit) return commit;
  }
  return `v${APP_VERSION}`;
}
