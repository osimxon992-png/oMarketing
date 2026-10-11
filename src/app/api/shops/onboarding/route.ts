import { handler, requireApiShop } from "@/lib/api";
import { db } from "@/lib/db";

export const POST = handler(async () => {
  const { shop } = await requireApiShop();
  await db.shop.update({ where: { id: shop.id }, data: { onboardingCompleted: true, onboardingStep: 6 } });
  return Response.json({ ok: true });
});
