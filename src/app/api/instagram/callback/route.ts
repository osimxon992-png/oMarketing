import { getCurrentUser } from "@/lib/auth/session";
import { encrypt, verifySignedValue } from "@/lib/crypto";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { exchangeCode, getProfile, InstagramApiError, subscribeWebhooks } from "@/lib/instagram/api";

/** OAuth redirect target: stores the account's long-lived token and subscribes to message webhooks. */
export async function GET(req: Request) {
  const base = env().APP_URL;
  const back = (status: string, detail?: string) =>
    Response.redirect(`${base}/dashboard/channels?ig=${status}${detail ? `&detail=${encodeURIComponent(detail.slice(0, 200))}` : ""}`, 303);

  const url = new URL(req.url);
  if (url.searchParams.get("error")) return back("denied");
  const state = verifySignedValue<{ shopId: string; userId: string }>(url.searchParams.get("state") ?? "");
  const code = url.searchParams.get("code");
  const user = await getCurrentUser();
  if (!state || !code || !user || user.id !== state.userId) return back("invalid_state");
  const shop = await db.shop.findFirst({ where: { id: state.shopId, ownerId: user.id } });
  if (!shop) return back("invalid_state");

  try {
    const { accessToken, expiresAt } = await exchangeCode(code);
    const profile = await getProfile(accessToken);
    const igId = profile.user_id ?? profile.id;
    const existing = await db.channel.findUnique({ where: { type_externalId: { type: "INSTAGRAM", externalId: igId } } });
    if (existing && existing.shopId !== shop.id) return back("already_used");

    await subscribeWebhooks(igId, accessToken);
    const data = {
      status: "ACTIVE" as const,
      username: profile.username ?? null,
      displayName: profile.name ?? profile.username ?? null,
      encryptedToken: encrypt(accessToken),
      tokenExpiresAt: expiresAt,
      lastError: null,
    };
    await db.channel.upsert({
      where: { type_externalId: { type: "INSTAGRAM", externalId: igId } },
      update: data,
      create: { shopId: shop.id, type: "INSTAGRAM", externalId: igId, ...data },
    });
    return back("connected");
  } catch (err) {
    console.error("[instagram] connect failed:", err instanceof Error ? err.message : err);
    return back("failed", err instanceof InstagramApiError ? err.message : undefined);
  }
}
