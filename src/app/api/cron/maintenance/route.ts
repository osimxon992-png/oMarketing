import { safeEqual } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

const DAY = 86_400_000;

/**
 * Housekeeping: drops expired sessions and link tokens, old webhook dedupe keys and
 * rate-limit windows. Call daily with `Authorization: Bearer <CRON_SECRET>`.
 */
export async function GET(req: Request) {
  const secret = env().CRON_SECRET;
  if (!secret || !safeEqual(req.headers.get("authorization") ?? "", `Bearer ${secret}`)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  const now = Date.now();
  const [sessions, linkTokens, processedUpdates, rateLimits] = await Promise.all([
    db.session.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    db.linkToken.deleteMany({ where: { expiresAt: { lt: new Date(now) } } }),
    db.processedUpdate.deleteMany({ where: { createdAt: { lt: new Date(now - 7 * DAY) } } }),
    db.rateLimit.deleteMany({ where: { windowStart: { lt: new Date(now - DAY) } } }),
  ]);
  return Response.json({
    ok: true,
    deleted: { sessions: sessions.count, linkTokens: linkTokens.count, processedUpdates: processedUpdates.count, rateLimits: rateLimits.count },
  });
}

export const POST = GET;
