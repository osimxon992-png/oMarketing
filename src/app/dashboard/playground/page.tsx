import { requireShop } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { BotReply } from "@/lib/bot/engine";
import { Playground, type ChatItem } from "./playground";

export const metadata = { title: "Test chat" };

export default async function PlaygroundPage() {
  const { user, shop } = await requireShop();
  const convo = await db.conversation.findFirst({
    where: { shopId: shop.id, channel: "PLAYGROUND", externalChatId: `owner:${user.id}` },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 200 } },
  });
  const history: ChatItem[] = (convo?.messages ?? []).map((m) => {
    const a = (m.attachments ?? {}) as Partial<BotReply>;
    return m.role === "CUSTOMER"
      ? { role: "user", text: m.text }
      : { role: "bot", text: a.payLinks?.length ? m.text.split("\n").filter((l) => !/^(Payme|Click): https?:/.test(l)).join("\n") : m.text, products: a.products, payLinks: a.payLinks, orderNumber: a.orderNumber };
  });
  return <Playground shopName={shop.name} botEnabled={shop.aiEnabled} initial={history} />;
}
