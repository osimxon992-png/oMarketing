import { z } from "zod";
import { ApiError, handler, parseJson, requireApiShop } from "@/lib/api";
import { invoicePaymentLinks } from "@/lib/billing";
import { db } from "@/lib/db";
import { ensurePlans } from "@/lib/shop";

/** Creates a subscription invoice and returns the ways to pay it (Telegram chat first). */
export const POST = handler(async (req: Request) => {
  const { shop } = await requireApiShop();
  const { planCode, months } = await parseJson(req, z.object({ planCode: z.string().min(1).max(40), months: z.union([z.literal(1), z.literal(3), z.literal(6), z.literal(12)]) }));
  await ensurePlans();
  const plan = await db.plan.findFirst({ where: { code: planCode, active: true } });
  if (!plan) throw new ApiError(404, "plan_not_found");
  // Reuse an identical pending invoice instead of piling up new ones.
  const invoice =
    (await db.billingInvoice.findFirst({ where: { shopId: shop.id, planId: plan.id, months, status: "PENDING" } })) ??
    (await db.billingInvoice.create({ data: { shopId: shop.id, planId: plan.id, months, amount: plan.priceUzs * months } }));
  return Response.json({ invoice: { id: invoice.id, amount: invoice.amount }, links: invoicePaymentLinks(invoice, { shopName: shop.name, planName: plan.name }) });
});
