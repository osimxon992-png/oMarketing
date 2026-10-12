import { z } from "zod";
import { handler, parseJson, requireApiShop } from "@/lib/api";
import { db } from "@/lib/db";

const text = (max: number) => z.string().trim().max(max);

const schema = z
  .object({
    name: text(80).min(2),
    aiEnabled: z.boolean(),
    greeting: text(1000),
    workingHours: text(200),
    pickupAddress: text(300),
    returnPolicy: text(2000),
    deliveryZones: z.array(z.object({ name: text(80).min(1), price: z.number().int().min(0).max(10_000_000) })).max(50),
    faq: z.array(z.object({ q: text(300).min(2), a: text(2000).min(1) })).max(100),
  })
  .partial();

/** Shop profile and bot settings (any subset of fields). */
export const PATCH = handler(async (req: Request) => {
  const { shop } = await requireApiShop();
  const data = await parseJson(req, schema);
  await db.shop.update({ where: { id: shop.id }, data });
  return Response.json({ ok: true });
});
