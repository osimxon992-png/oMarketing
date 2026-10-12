import { headers } from "next/headers";
import { z } from "zod";
import { ApiError, handler, parseJson } from "@/lib/api";
import { adminConfigured, checkAdminCredentials, startAdminSession } from "@/lib/auth/admin";
import { clientIp } from "@/lib/auth/session";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({ login: z.string().min(1).max(200), password: z.string().min(1).max(200) });

export const POST = handler(async (req: Request) => {
  if (!adminConfigured()) throw new ApiError(503, "admin_not_configured");
  const ip = clientIp(await headers());
  const [byIp, total] = await Promise.all([rateLimit(`admin:login:ip:${ip}`, 5, 900), rateLimit("admin:login", 30, 900)]);
  if (!byIp.ok) return tooManyRequests(byIp);
  if (!total.ok) return tooManyRequests(total);

  const body = await parseJson(req, schema);
  if (!checkAdminCredentials(body.login, body.password)) throw new ApiError(401, "invalid_credentials");
  await startAdminSession();
  return Response.json({ ok: true });
});
