import { samePassword } from "@/lib/attempt-limit";
import { runDueSchedules } from "@/lib/pm";

// Called by an external scheduler (e.g. Vercel Cron, every 15 min):
//   GET /api/cron/pm  with  Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const given = req.headers.get("authorization")?.replace(/^Bearer /, "") ?? "";
  // Compared as digests: constant time whatever the length or characters sent.
  if (!samePassword(given, process.env.CRON_SECRET)) return new Response("Unauthorized", { status: 401 });
  return Response.json(await runDueSchedules());
}
