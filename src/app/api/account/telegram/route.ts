import { ApiError, handler, requireApiUser } from "@/lib/api";
import { randomToken, sha256 } from "@/lib/crypto";
import { db } from "@/lib/db";
import { notifierStartLink } from "@/lib/telegram/notifier";

const TTL_MS = 15 * 60_000;

/** Starts linking: returns a t.me deep link that carries a one-time token to the notifier bot. */
export const POST = handler(async () => {
  const user = await requireApiUser();
  const token = randomToken(24);
  const url = notifierStartLink(token);
  if (!url) throw new ApiError(503, "bot_not_configured");
  await db.linkToken.deleteMany({ where: { userId: user.id } });
  await db.linkToken.create({ data: { token: sha256(token), userId: user.id, expiresAt: new Date(Date.now() + TTL_MS) } });
  return Response.json({ url });
});

/** Stops order alerts. */
export const DELETE = handler(async () => {
  const user = await requireApiUser();
  await db.user.update({ where: { id: user.id }, data: { notifyChatId: null } });
  return Response.json({ ok: true });
});
