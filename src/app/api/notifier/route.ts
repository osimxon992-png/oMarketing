import { safeEqual, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { sendMessage } from "@/lib/telegram/bot-api";

type Update = {
  message?: { text?: string; chat: { id: number; type: string }; from?: { is_bot?: boolean } };
};

/**
 * Webhook for the platform notifier bot. `/start <token>` (from the "Connect" button in
 * settings) links this Telegram chat to the user so order alerts reach them.
 * Register it with `npm run telegram:set-notifier-webhook`.
 */
export async function POST(req: Request) {
  const { PLATFORM_BOT_TOKEN: token, PLATFORM_BOT_WEBHOOK_SECRET: secret } = env();
  if (!token || !secret || !safeEqual(req.headers.get("x-telegram-bot-api-secret-token") ?? "", secret)) {
    return new Response("forbidden", { status: 403 });
  }
  const msg = ((await req.json().catch(() => ({}))) as Update).message;
  if (!msg?.text || msg.from?.is_bot || msg.chat.type !== "private") return new Response("ok");

  const start = /^\/start(?:@\w+)?\s+([A-Za-z0-9_-]{20,64})$/.exec(msg.text.trim());
  let reply = "oMarketing bildirishnomalari boti. Ulash uchun saytda Sozlamalar → Telegram bildirishnomalari → «Ulash» tugmasini bosing.";
  if (start?.[1]) {
    const link = await db.linkToken.findUnique({ where: { token: sha256(start[1]) } });
    if (link && link.expiresAt > new Date()) {
      await db.$transaction([
        db.user.update({ where: { id: link.userId }, data: { notifyChatId: BigInt(msg.chat.id) } }),
        db.linkToken.deleteMany({ where: { userId: link.userId } }),
      ]);
      reply = "✅ Ulandi! Endi yangi buyurtmalar haqida shu yerga xabar keladi.";
    } else {
      reply = "Havola eskirgan. Saytda «Ulash» tugmasini qayta bosing.";
    }
  }
  try {
    await sendMessage(token, msg.chat.id, reply);
  } catch (err) {
    console.error("[notifier] reply failed:", err instanceof Error ? err.message : err);
  }
  return new Response("ok");
}
