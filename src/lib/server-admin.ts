import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { requirePermission } from "@/lib/context";
import { AttemptLimiter, samePassword } from "@/lib/attempt-limit";

// Server administration (software name, updates, backups) acts on the whole server, not one company,
// so company roles aren't enough: anyone can create a company on an open demo. It also needs the
// server password (SERVER_ADMIN_PASSWORD, else FACTORY_RESET_PASSWORD), which unlocks it for 30 minutes.

export const SERVER_ADMIN_COOKIE = "server_admin";
const TTL_MS = 30 * 60_000;
const limiter = new AttemptLimiter();

const password = () => process.env.SERVER_ADMIN_PASSWORD || process.env.FACTORY_RESET_PASSWORD || null;
export const serverAdminEnabled = () => !!password();

const sign = (payload: string) => createHmac("sha256", `server-admin:${process.env.AUTH_SECRET}`).update(payload).digest("base64url");

export async function clientAddress() {
  const h = await headers();
  return h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
}

/** Checks the password and, if right, sets the unlock cookie for this user. */
export async function unlockServerAdmin(userId: string, input: string): Promise<"ok" | "wrong" | "blocked" | "disabled"> {
  if (!serverAdminEnabled()) return "disabled";
  const client = await clientAddress();
  if (limiter.blocked(client)) return "blocked";
  if (!samePassword(input, password())) {
    limiter.fail(client);
    return "wrong";
  }
  const exp = Date.now() + TTL_MS;
  const payload = `${userId}.${exp}`;
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(SERVER_ADMIN_COOKIE, `${payload}.${sign(payload)}`, { httpOnly: true, sameSite: "strict", secure, path: "/", maxAge: TTL_MS / 1000 });
  return "ok";
}

export async function lockServerAdmin() {
  (await cookies()).delete(SERVER_ADMIN_COOKIE);
}

export async function isServerAdmin(userId: string) {
  if (!serverAdminEnabled()) return false;
  const raw = (await cookies()).get(SERVER_ADMIN_COOKIE)?.value;
  if (!raw) return false;
  const i = raw.lastIndexOf(".");
  const payload = raw.slice(0, i);
  const [uid, exp] = payload.split(".");
  const expected = Buffer.from(sign(payload));
  const given = Buffer.from(raw.slice(i + 1));
  return uid === userId && Number(exp) > Date.now() && expected.length === given.length && timingSafeEqual(expected, given);
}

/** For server actions and routes: company owner/admin with the server unlocked. */
export async function requireServerAdmin() {
  const ctx = await requirePermission("org.manage");
  if (!(await isServerAdmin(ctx.user.id))) throw new Error("Forbidden");
  return ctx;
}
