import { z } from "zod";
import { handler, parseJson, requireApiShop } from "@/lib/api";
import { handleIncoming } from "@/lib/bot/conversation";
import { db } from "@/lib/db";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const chatId = (userId: string) => `owner:${userId}`;

/** The owner writes as a customer; the bot answers exactly as on a real channel. */
export const POST = handler(async (req: Request) => {
  const { user, shop } = await requireApiShop();
  const limit = await rateLimit(`playground:${user.id}`, 120, 600);
  if (!limit.ok) return tooManyRequests(limit);
  const { text } = await parseJson(req, z.object({ text: z.string().trim().min(1).max(2000) }));
  const result = await handleIncoming({
    shop,
    channel: "PLAYGROUND",
    externalChatId: chatId(user.id),
    customer: { externalId: chatId(user.id), name: user.name },
    text,
  });
  return Response.json({ reply: result.reply, skipped: result.skipped ?? null });
});

/** Starts over: removes the test conversation (test orders stay, marked as test). */
export const DELETE = handler(async () => {
  const { user, shop } = await requireApiShop();
  await db.conversation.deleteMany({ where: { shopId: shop.id, channel: "PLAYGROUND", externalChatId: chatId(user.id) } });
  return Response.json({ ok: true });
});
