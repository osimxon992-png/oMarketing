import { z } from "zod";
import { ApiError, handler, parseJson, requireApiShop } from "@/lib/api";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { sendMessage, TelegramApiError } from "@/lib/telegram/bot-api";

type Ctx = { params: Promise<{ id: string }> };

/** Seller reply. Telegram conversations are delivered through the shop's bot. */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const { shop } = await requireApiShop();
  const { id } = await params;
  const { text } = await parseJson(req, z.object({ text: z.string().trim().min(1).max(4000) }));
  const convo = await db.conversation.findFirst({ where: { id, shopId: shop.id }, include: { channelRef: true } });
  if (!convo) throw new ApiError(404, "not_found");

  let delivered = convo.channel === "PLAYGROUND" || convo.channel === "DEMO";
  let externalId: string | undefined;
  if (convo.channel === "TELEGRAM") {
    if (!convo.channelRef || convo.channelRef.status !== "ACTIVE") throw new ApiError(409, "channel_disconnected");
    try {
      const sent = await sendMessage(decrypt(convo.channelRef.encryptedToken), convo.externalChatId, text);
      externalId = String(sent.message_id);
      delivered = true;
    } catch (err) {
      if (err instanceof TelegramApiError) throw new ApiError(502, "telegram_failed", err.description);
      throw err;
    }
  }
  if (!delivered) throw new ApiError(409, "channel_not_supported");

  const message = await db.$transaction(async (tx) => {
    const m = await tx.message.create({ data: { shopId: shop.id, conversationId: convo.id, role: "SELLER", text, externalId } });
    await tx.conversation.update({
      where: { id: convo.id },
      data: { messageCount: { increment: 1 }, unread: 0, lastMessageAt: new Date(), lastMessagePreview: text.slice(0, 140) },
    });
    return m;
  });
  return Response.json({ ok: true, message: { id: message.id, createdAt: message.createdAt } });
});
