import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError, handler, parseJson } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { clientIp, createSession } from "@/lib/auth/session";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { emailSchema, passwordSchema } from "@/lib/validation";

const schema = z.object({
  name: z.string().trim().min(1).max(100),
  email: emailSchema,
  password: passwordSchema,
});

export const POST = handler(async (req: Request) => {
  const ip = clientIp(await headers());
  const rl = await rateLimit(`auth:register:${ip}`, 10, 3600);
  if (!rl.ok) return tooManyRequests(rl);

  const body = await parseJson(req, schema);
  const existing = await db.user.findUnique({ where: { email: body.email } });
  if (existing) throw new ApiError(409, "email_taken");

  const user = await db.user.create({
    data: {
      name: body.name,
      email: body.email,
      passwordHash: await hashPassword(body.password),
      role: env().ADMIN_EMAILS.includes(body.email) ? "ADMIN" : "USER",
    },
  });
  await createSession(user.id);
  return Response.json({ ok: true, redirect: "/onboarding" });
});
