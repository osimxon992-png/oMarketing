import { cookies } from "next/headers";
import { z } from "zod";
import { ApiError, handler, parseJson, requireApiUser } from "@/lib/api";
import { SHOP_COOKIE } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { createShop } from "@/lib/shop";

const schema = z.object({ name: z.string().trim().min(2).max(80) });

export const POST = handler(async (req: Request) => {
  const user = await requireApiUser();
  const { name } = await parseJson(req, schema);
  const count = await db.shop.count({ where: { ownerId: user.id } });
  if (count >= 5) throw new ApiError(400, "shop_limit", "You can own up to 5 shops");

  const jar = await cookies();
  const shop = await createShop(user.id, name, jar.get("sotuv_ref")?.value ?? null);
  await db.shop.update({ where: { id: shop.id }, data: { onboardingStep: 1 } });
  jar.delete("sotuv_ref");
  jar.set(SHOP_COOKIE, shop.id, { httpOnly: true, sameSite: "lax", path: "/", maxAge: 365 * 86_400 });
  return Response.json({ ok: true, shop: { id: shop.id, slug: shop.slug } });
});
