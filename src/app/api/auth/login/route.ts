import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError, handler, parseJson } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { clientIp, createSession } from "@/lib/auth/session";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { emailSchema } from "@/lib/validation";

const schema = z.object({ email: emailSchema, password: z.string().min(1).max(200) });

export const POST = handler(async (req: Request) => {
  const ip = clientIp(await headers());
  const body = await parseJson(req, schema);
  // Limit per IP and per account to slow down credential stuffing.
  const [byIp, byEmail] = await Promise.all([
    rateLimit(`auth:login:ip:${ip}`, 20, 900),
    rateLimit(`auth:login:email:${body.email}`, 8, 900),
  ]);
  if (!byIp.ok) return tooManyRequests(byIp);
  if (!byEmail.ok) return tooManyRequests(byEmail);

  const user = await db.user.findUnique({ where: { email: body.email } });
  const ok = user?.passwordHash ? await verifyPassword(user.passwordHash, body.password) : false;
  if (!user || !ok) throw new ApiError(401, "invalid_credentials");

  await createSession(user.id);
  const hasShop = await db.shop.count({ where: { ownerId: user.id } });
  return Response.json({ ok: true, redirect: hasShop ? "/dashboard" : "/onboarding" });
});
