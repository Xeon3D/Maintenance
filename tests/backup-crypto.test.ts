import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import { decryptFile, encryptFile, isEncrypted } from "@/lib/backup-crypto";

const dir = await mkdtemp(path.join(tmpdir(), "backup-crypto-"));
afterAll(() => rm(dir, { recursive: true, force: true }));
const p = (n: string) => path.join(dir, n);

describe("backup encryption", () => {
  const data = randomBytes(300_000); // several stream chunks

  it("round-trips with the right password and marks the file", async () => {
    await writeFile(p("plain"), data);
    await encryptFile(p("plain"), p("enc"), "correct horse");
    expect(await isEncrypted(p("enc"))).toBe(true);
    expect(await isEncrypted(p("plain"))).toBe(false);
    expect((await readFile(p("enc"))).includes(data.subarray(0, 64))).toBe(false);
    await decryptFile(p("enc"), p("out"), "correct horse");
    expect((await readFile(p("out"))).equals(data)).toBe(true);
  });

  it("rejects a wrong or missing password", async () => {
    await expect(decryptFile(p("enc"), p("bad"), "wrong")).rejects.toMatchObject({ code: "wrongBackupPassword" });
    await expect(decryptFile(p("enc"), p("bad"), null)).rejects.toMatchObject({ code: "encryptedNoPassword" });
  });

  it("detects a modified file", async () => {
    const buf = await readFile(p("enc"));
    buf[buf.length - 100] ^= 1;
    await writeFile(p("tampered"), buf);
    await expect(decryptFile(p("tampered"), p("bad2"), "correct horse")).rejects.toMatchObject({ code: "wrongBackupPassword" });
  });
});
