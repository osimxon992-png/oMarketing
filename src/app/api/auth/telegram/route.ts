import { headers } from "next/headers";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { ApiError, handler } from "@/lib/api";
import { clientIp, createSession, getCurrentUser } from "@/lib/auth/session";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";
import { verifyTelegramLogin } from "@/lib/telegram/login";

/** Telegram Login Widget callback. Logs in, registers, or links Telegram to the current account. */
export const POST = handler(async (req: Request) => {
  const ip = clientIp(await headers());
  const rl = await rateLimit(`auth:telegram:${ip}`, 20, 900);
  if (!rl.ok) return tooManyRequests(rl);

  const token = env().PLATFORM_BOT_TOKEN;
  if (!token) throw new ApiError(503, "telegram_not_configured");

  const raw = (await req.json().catch(() => null)) as Record<string, unknown> | null;
  if (!raw || typeof raw !== "object") throw new ApiError(400, "invalid_json");
  const data = verifyTelegramLogin(raw, token);
  if (!data) throw new ApiError(401, "telegram_auth_failed");

  const telegramId = BigInt(data.id);
  const name = [data.first_name, data.last_name].filter(Boolean).join(" ") || data.username || "Telegram user";
  const current = await getCurrentUser();

  if (current) {
    const owner = await db.user.findUnique({ where: { telegramId } });
    if (owner && owner.id !== current.id) throw new ApiError(409, "telegram_already_linked");
    await db.user.update({
      where: { id: current.id },
      data: { telegramId, telegramUsername: data.username ?? null, notifyChatId: telegramId },
    });
    return Response.json({ ok: true, redirect: "/dashboard/settings" });
  }

  const user = await db.user.upsert({
    where: { telegramId },
    update: { telegramUsername: data.username ?? null },
    // The widget requests write access, so the notifier bot may message this chat.
    create: { telegramId, telegramUsername: data.username ?? null, name, notifyChatId: telegramId },
  });
  await createSession(user.id);
  const hasShop = await db.shop.count({ where: { ownerId: user.id } });
  return Response.json({ ok: true, redirect: hasShop ? "/dashboard" : "/onboarding" });
});
