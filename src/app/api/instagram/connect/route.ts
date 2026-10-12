import { getCurrentShop, getCurrentUser } from "@/lib/auth/session";
import { signValue } from "@/lib/crypto";
import { env, features } from "@/lib/env";
import { authorizeUrl } from "@/lib/instagram/api";
import { getEntitlements } from "@/lib/shop";

/** Starts Business Login for Instagram for the current shop. */
export async function GET() {
  const base = env().APP_URL;
  const user = await getCurrentUser();
  const shop = await getCurrentShop();
  if (!user || !shop) return Response.redirect(`${base}/login`, 303);
  if (!features().instagram) return Response.redirect(`${base}/dashboard/channels?ig=not_configured`, 303);
  if (!(await getEntitlements(shop)).instagram) return Response.redirect(`${base}/dashboard/channels?ig=plan`, 303);
  const state = signValue({ shopId: shop.id, userId: user.id }, 600);
  return Response.redirect(authorizeUrl(state), 303);
}
