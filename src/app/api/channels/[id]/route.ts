import { ApiError, handler, requireApiShop } from "@/lib/api";
import { decrypt } from "@/lib/crypto";
import { db } from "@/lib/db";
import { deleteWebhook } from "@/lib/telegram/bot-api";

type Ctx = { params: Promise<{ id: string }> };

/** Disconnects a channel. Its conversations stay in the inbox. */
export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const { shop } = await requireApiShop();
  const { id } = await params;
  const channel = await db.channel.findFirst({ where: { id, shopId: shop.id } });
  if (!channel) throw new ApiError(404, "not_found");
  if (channel.type === "TELEGRAM_BOT") {
    await deleteWebhook(decrypt(channel.encryptedToken)).catch(() => undefined);
  }
  await db.channel.delete({ where: { id: channel.id } });
  return Response.json({ ok: true });
});
