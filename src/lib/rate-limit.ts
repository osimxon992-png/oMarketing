import "server-only";
import { db } from "@/lib/db";

export type RateLimitResult = { ok: boolean; remaining: number; resetAt: Date };

/**
 * Fixed-window rate limiter backed by Postgres, so it holds across
 * multiple app instances. `key` should include the route and the client.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<RateLimitResult> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  const rows = await db.$queryRaw<{ count: number }[]>`
    INSERT INTO "RateLimit" ("key", "windowStart", "count") VALUES (${key}, ${windowStart}, 1)
    ON CONFLICT ("key", "windowStart") DO UPDATE SET "count" = "RateLimit"."count" + 1
    RETURNING "count"`;
  const count = Number(rows[0]?.count ?? 1);
  return { ok: count <= limit, remaining: Math.max(0, limit - count), resetAt: new Date(windowStart.getTime() + windowMs) };
}

export function tooManyRequests(result: RateLimitResult): Response {
  return Response.json(
    { error: "rate_limited" },
    { status: 429, headers: { "Retry-After": String(Math.max(1, Math.ceil((result.resetAt.getTime() - Date.now()) / 1000))) } },
  );
}
