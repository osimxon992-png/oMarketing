import { z } from "zod";
import { ApiError, handler, parseJson, requireApiShop } from "@/lib/api";
import { encrypt, randomToken, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getMe, isBotToken, setWebhook, TelegramApiError } from "@/lib/telegram/bot-api";

/** Connects a Telegram bot: validates the token with getMe, stores it encrypted and sets the webhook. */
export const POST = handler(async (req: Request) => {
  const { shop } = await requireApiShop();
  const { token } = await parseJson(req, z.object({ token: z.string().trim().min(10).max(200) }));
  if (!isBotToken(token)) throw new ApiError(422, "invalid_token");

  let bot;
  try {
    bot = await getMe(token);
  } catch (err) {
    if (err instanceof TelegramApiError) throw new ApiError(422, "token_rejected", err.description);
    throw err;
  }
  const externalId = String(bot.id);
  const existing = await db.channel.findUnique({ where: { type_externalId: { type: "TELEGRAM_BOT", externalId } } });
  if (existing && existing.shopId !== shop.id) throw new ApiError(409, "already_used");

  const secret = randomToken(24);
  const data = {
    status: "ACTIVE" as const,
    username: bot.username ?? null,
    displayName: bot.first_name,
    encryptedToken: encrypt(token),
    webhookSecretHash: sha256(secret),
    lastError: null as string | null,
  };
  const channel = await db.channel.upsert({
    where: { type_externalId: { type: "TELEGRAM_BOT", externalId } },
    update: data,
    create: { shopId: shop.id, type: "TELEGRAM_BOT", externalId, ...data },
  });

  // Telegram only delivers webhooks to public HTTPS URLs.
  const appUrl = env().APP_URL;
  let webhook: "ok" | "needs_https" | "failed" = "needs_https";
  let webhookError: string | undefined;
  if (appUrl.startsWith("https://")) {
    try {
      await setWebhook(token, `${appUrl}/api/telegram/${channel.id}`, secret);
      webhook = "ok";
    } catch (err) {
      webhook = "failed";
      webhookError = err instanceof TelegramApiError ? err.description : "unknown error";
      await db.channel.update({ where: { id: channel.id }, data: { lastError: `webhook: ${webhookError}` } });
    }
  } else {
    await db.channel.update({ where: { id: channel.id }, data: { lastError: "webhook: APP_URL is not HTTPS" } });
  }
  return Response.json({ ok: true, channel: { id: channel.id, username: bot.username }, webhook, webhookError, appUrl });
});
