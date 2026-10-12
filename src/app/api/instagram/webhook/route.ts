import type { Channel } from "@prisma/client";
import { handleIncoming } from "@/lib/bot/conversation";
import { decrypt, encrypt, safeEqual } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getSender, refreshToken, sendMessage, verifySignature } from "@/lib/instagram/api";

type MessagingEvent = {
  sender?: { id?: string };
  recipient?: { id?: string };
  message?: { mid?: string; text?: string; is_echo?: boolean; is_deleted?: boolean };
};
type Payload = { object?: string; entry?: { id?: string; messaging?: MessagingEvent[] }[] };

/** Meta's subscription check: echo hub.challenge when the verify token matches. */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const expected = env().META_WEBHOOK_VERIFY_TOKEN;
  if (q.get("hub.mode") === "subscribe" && expected && safeEqual(q.get("hub.verify_token") ?? "", expected)) {
    return new Response(q.get("hub.challenge") ?? "", { status: 200 });
  }
  return new Response("forbidden", { status: 403 });
}

export async function POST(req: Request) {
  const raw = await req.text();
  if (!verifySignature(raw, req.headers.get("x-hub-signature-256"))) return new Response("bad signature", { status: 401 });
  let payload: Payload;
  try {
    payload = JSON.parse(raw) as Payload;
  } catch {
    return new Response("ok");
  }
  if (payload.object !== "instagram") return new Response("ok");

  for (const entry of payload.entry ?? []) {
    for (const ev of entry.messaging ?? []) {
      const text = ev.message?.text?.trim();
      const mid = ev.message?.mid;
      const senderId = ev.sender?.id;
      if (!text || !mid || !senderId || ev.message?.is_echo || ev.message?.is_deleted) continue;
      const accountId = entry.id ?? ev.recipient?.id;
      if (!accountId || senderId === accountId) continue;
      try {
        await processMessage(accountId, senderId, mid, text);
      } catch (err) {
        console.error("[instagram] message failed:", err instanceof Error ? err.message : err);
      }
    }
  }
  return new Response("ok");
}

async function processMessage(accountId: string, senderId: string, mid: string, text: string) {
  const channel = await db.channel.findUnique({ where: { type_externalId: { type: "INSTAGRAM", externalId: accountId } } });
  if (!channel || channel.status !== "ACTIVE") return;
  // Meta retries deliveries; process each message once.
  const fresh = await db.processedUpdate.createMany({ data: [{ id: `ig:${mid}` }], skipDuplicates: true });
  if (fresh.count === 0) return;

  const shop = await db.shop.findUnique({ where: { id: channel.shopId }, include: { plan: true } });
  if (!shop || shop.status !== "ACTIVE") return;
  const token = await freshToken(channel);
  const existing = await db.customer.findUnique({
    where: { shopId_channel_externalId: { shopId: shop.id, channel: "INSTAGRAM", externalId: senderId } },
    select: { id: true },
  });
  const sender = existing ? {} : await getSender(senderId, token);

  const result = await handleIncoming({
    shop,
    channel: "INSTAGRAM",
    channelId: channel.id,
    externalChatId: senderId,
    customer: { externalId: senderId, name: sender.name ?? sender.username ?? "", username: sender.username ?? undefined },
    text,
    externalMessageId: mid,
  });
  if (result.replyText) {
    try {
      await sendMessage(accountId, token, senderId, result.replyText);
    } catch (err) {
      await db.channel.update({ where: { id: channel.id }, data: { lastError: err instanceof Error ? err.message.slice(0, 300) : "send failed" } });
      throw err;
    }
  }
}

/** Long-lived tokens last ~60 days; refresh when fewer than 10 remain. */
async function freshToken(channel: Channel): Promise<string> {
  const token = decrypt(channel.encryptedToken);
  if (!channel.tokenExpiresAt || channel.tokenExpiresAt.getTime() - Date.now() > 10 * 86_400_000) return token;
  try {
    const next = await refreshToken(token);
    await db.channel.update({ where: { id: channel.id }, data: { encryptedToken: encrypt(next.accessToken), tokenExpiresAt: next.expiresAt } });
    return next.accessToken;
  } catch {
    return token;
  }
}
