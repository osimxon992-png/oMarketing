import "server-only";
import type { ConversationChannel, Plan, Prisma, Shop } from "@prisma/client";
import { db } from "@/lib/db";
import { consumeReply, getEntitlements } from "@/lib/shop";
import { botReply, type BotReply, type BotState } from "./engine";

export type Incoming = {
  shop: Shop & { plan?: Plan | null };
  channel: ConversationChannel;
  channelId?: string | null;
  externalChatId: string;
  customer: { externalId: string; name?: string; username?: string | null };
  text: string;
  externalMessageId?: string;
};

export type HandledMessage = {
  conversationId: string;
  reply: BotReply | null;
  /** Reply as plain text, payment links included — what gets sent to the customer. */
  replyText?: string;
  skipped?: "paused" | "disabled" | "inactive" | "quota";
};

/** Stores an incoming customer message and, when the bot may answer, its reply. */
export async function handleIncoming(msg: Incoming): Promise<HandledMessage> {
  const { shop } = msg;
  const text = msg.text.slice(0, 4000);
  const customer = await db.customer.upsert({
    where: { shopId_channel_externalId: { shopId: shop.id, channel: msg.channel, externalId: msg.customer.externalId } },
    update: { ...(msg.customer.username !== undefined ? { username: msg.customer.username } : {}) },
    create: {
      shopId: shop.id,
      channel: msg.channel,
      externalId: msg.customer.externalId,
      name: msg.customer.name ?? "",
      username: msg.customer.username ?? null,
    },
  });
  const convo = await db.conversation.upsert({
    where: { shopId_channel_externalChatId: { shopId: shop.id, channel: msg.channel, externalChatId: msg.externalChatId } },
    update: {},
    create: { shopId: shop.id, channel: msg.channel, channelId: msg.channelId ?? null, customerId: customer.id, externalChatId: msg.externalChatId },
  });

  await db.$transaction([
    db.message.create({ data: { shopId: shop.id, conversationId: convo.id, role: "CUSTOMER", text, externalId: msg.externalMessageId } }),
    db.conversation.update({
      where: { id: convo.id },
      data: { messageCount: { increment: 1 }, unread: { increment: 1 }, lastMessageAt: new Date(), lastMessagePreview: text.slice(0, 140) },
    }),
  ]);

  if (convo.aiPaused) return { conversationId: convo.id, reply: null, skipped: "paused" };
  if (!shop.aiEnabled) return { conversationId: convo.id, reply: null, skipped: "disabled" };
  const isTest = msg.channel === "PLAYGROUND" || msg.channel === "DEMO";
  if (!isTest) {
    const ent = await getEntitlements(shop);
    if (!ent.active) return { conversationId: convo.id, reply: null, skipped: "inactive" };
    if (!(await consumeReply(shop.id, ent.monthlyReplies))) return { conversationId: convo.id, reply: null, skipped: "quota" };
  }

  const payment = await db.shopPaymentConfig.findUnique({ where: { shopId: shop.id } });
  const { reply, state } = await botReply(shop, payment, { id: convo.id, customerId: customer.id, channel: msg.channel }, text, convo.botState as BotState);
  const replyText = await saveBotMessage(shop.id, convo.id, reply, state);
  return { conversationId: convo.id, reply, replyText };
}

export async function saveBotMessage(shopId: string, conversationId: string, reply: BotReply, state: BotState) {
  const attachments: Prisma.InputJsonValue | undefined =
    reply.products?.length || reply.payLinks?.length || reply.orderNumber
      ? { products: reply.products ?? [], payLinks: reply.payLinks ?? [], orderNumber: reply.orderNumber ?? null }
      : undefined;
  const fullText = reply.payLinks?.length ? `${reply.text}\n${reply.payLinks.map((l) => `${l.provider === "payme" ? "Payme" : "Click"}: ${l.url}`).join("\n")}` : reply.text;
  await db.$transaction([
    db.message.create({ data: { shopId, conversationId, role: "AI", text: fullText, attachments } }),
    db.conversation.update({
      where: { id: conversationId },
      data: { messageCount: { increment: 1 }, lastMessageAt: new Date(), lastMessagePreview: fullText.slice(0, 140), botState: state as Prisma.InputJsonValue },
    }),
  ]);
  return fullText;
}
