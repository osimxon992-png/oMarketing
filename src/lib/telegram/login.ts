import { createHash, createHmac } from "node:crypto";
import { z } from "zod";
import { safeEqual } from "@/lib/crypto";

export const telegramAuthSchema = z.object({
  id: z.coerce.number().int().positive(),
  first_name: z.string().max(256).optional().default(""),
  last_name: z.string().max(256).optional(),
  username: z.string().max(64).optional(),
  photo_url: z.string().max(1024).optional(),
  auth_date: z.coerce.number().int().positive(),
  hash: z.string().regex(/^[a-f0-9]{64}$/),
});

export type TelegramAuthData = z.infer<typeof telegramAuthSchema>;

/**
 * Verifies Telegram Login Widget data:
 * https://core.telegram.org/widgets/login#checking-authorization
 */
export function verifyTelegramLogin(
  raw: Record<string, unknown>,
  botToken: string,
  maxAgeSeconds = 86_400,
  now = Date.now(),
): TelegramAuthData | null {
  const parsed = telegramAuthSchema.safeParse(raw);
  if (!parsed.success) return null;
  const checkString = Object.keys(raw)
    .filter((k) => k !== "hash" && raw[k] !== undefined && raw[k] !== null)
    .sort()
    .map((k) => `${k}=${String(raw[k])}`)
    .join("\n");
  const secret = createHash("sha256").update(botToken).digest();
  const expected = createHmac("sha256", secret).update(checkString).digest("hex");
  if (!safeEqual(expected, parsed.data.hash)) return null;
  if (now / 1000 - parsed.data.auth_date > maxAgeSeconds) return null;
  return parsed.data;
}
