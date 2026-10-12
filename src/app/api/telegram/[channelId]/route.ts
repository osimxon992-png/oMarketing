import { handleIncoming } from "@/lib/bot/conversation";
import { decrypt, safeEqual, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { sendMessage } from "@/lib/telegram/bot-api";

type Ctx = { params: Promise<{ channelId: string }> };
type Update = {
  update_id?: number;
  message?: {
    message_id: number;
    text?: string;
    chat: { id: number; type: string };
    from?: { id: number; is_bot?: boolean; first_name?: string; last_name?: string; username?: string };
  };
};

/** Webhook for a shop's Telegram bot. Always answers 200 so Telegram doesn't retry forever. */
export async function POST(req: Request, { params }: Ctx) {
  const { channelId } = await params;
  const channel = await db.channel.findUnique({ where: { id: channelId } });
  const secret = req.headers.get("x-telegram-bot-api-secret-token") ?? "";
  if (!channel || channel.type !== "TELEGRAM_BOT" || !channel.webhookSecretHash || !safeEqual(sha256(secret), channel.webhookSecretHash)) {
    return new Response("forbidden", { status: 403 });
  }
  const update = (await req.json().catch(() => ({}))) as Update;
  const msg = update.message;
  if (channel.status !== "ACTIVE" || !msg?.text || !msg.from || msg.from.is_bot || msg.chat.type !== "private") return new Response("ok");

  const fresh = await db.processedUpdate.createMany({ data: [{ id: `tg:${channel.id}:${update.update_id}` }], skipDuplicates: true });
  if (fresh.count === 0) return new Response("ok");

  try {
    const shop = await db.shop.findUnique({ where: { id: channel.shopId }, include: { plan: true } });
    if (!shop || shop.status !== "ACTIVE") return new Response("ok");
    // "/start" from the bot's Start button is a greeting.
    const text = msg.text.startsWith("/start") ? "salom" : msg.text;
    const result = await handleIncoming({
      shop,
      channel: "TELEGRAM",
      channelId: channel.id,
      externalChatId: String(msg.chat.id),
      customer: {
        externalId: String(msg.from.id),
        name: [msg.from.first_name, msg.from.last_name].filter(Boolean).join(" "),
        username: msg.from.username ?? null,
      },
      text,
      externalMessageId: String(msg.message_id),
    });
    if (result.replyText) await sendMessage(decrypt(channel.encryptedToken), msg.chat.id, result.replyText);
    if (channel.lastError) await db.channel.update({ where: { id: channel.id }, data: { lastError: null } });
  } catch (err) {
    console.error("[telegram] update failed:", err instanceof Error ? err.message : err);
    await db.channel.update({ where: { id: channel.id }, data: { lastError: err instanceof Error ? err.message.slice(0, 300) : "error" } });
  }
  return new Response("ok");
}
