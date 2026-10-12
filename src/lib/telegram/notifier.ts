import "server-only";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { formatUzs } from "@/lib/utils/format";
import { sendMessage } from "./bot-api";

/** Platform bot link that ties the sender's Telegram chat to a user (see /api/notifier). */
export function notifierStartLink(token: string): string | null {
  const bot = env().PLATFORM_BOT_USERNAME;
  return bot ? `https://t.me/${bot}?start=${token}` : null;
}

/** Messages the shop owner through the platform bot. Never throws: alerts must not break the sale. */
export async function notifyShopOwner(shopId: string, text: string): Promise<void> {
  const token = env().PLATFORM_BOT_TOKEN;
  if (!token) return;
  try {
    const shop = await db.shop.findUnique({ where: { id: shopId }, select: { owner: { select: { notifyChatId: true } } } });
    const chatId = shop?.owner.notifyChatId;
    if (chatId) await sendMessage(token, chatId.toString(), text);
  } catch (err) {
    console.error("[notifier] send failed:", err instanceof Error ? err.message : err);
  }
}

export async function notifyNewOrder(order: {
  id: string;
  shopId: string;
  number: number;
  customerName: string;
  phone: string;
  total: number;
  deliveryType: string;
  deliveryAddress: string;
}): Promise<void> {
  const lines = [
    `🛒 Yangi buyurtma #${order.number}`,
    `Mijoz: ${order.customerName || "—"}${order.phone ? `, ${order.phone}` : ""}`,
    order.deliveryType === "DELIVERY" ? `Yetkazib berish: ${order.deliveryAddress || "—"}` : "Olib ketish",
    `Jami: ${formatUzs(order.total)}`,
    `${env().APP_URL}/dashboard/orders/${order.id}`,
  ];
  await notifyShopOwner(order.shopId, lines.join("\n"));
}
