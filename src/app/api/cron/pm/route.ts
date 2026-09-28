import { timingSafeEqual } from "node:crypto";
import { runDueSchedules } from "@/lib/pm";

// Called by an external scheduler (e.g. Vercel Cron, every 15 min):
//   GET /api/cron/pm  with  Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  const ok = !!secret && given.length === secret.length && timingSafeEqual(Buffer.from(given), Buffer.from(secret));
  if (!ok) return new Response("Unauthorized", { status: 401 });
  return Response.json(await runDueSchedules());
}
