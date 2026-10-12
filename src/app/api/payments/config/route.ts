import { z } from "zod";
import { ApiError, handler, parseJson, requireApiShop } from "@/lib/api";
import { encrypt } from "@/lib/crypto";
import { db } from "@/lib/db";

const id = z.string().trim().max(64);
const schema = z.object({
  paymeEnabled: z.boolean(),
  paymeMerchantId: id,
  paymeKey: z.string().trim().max(200).optional(),
  paymeTestMode: z.boolean(),
  clickEnabled: z.boolean(),
  clickServiceId: id,
  clickMerchantId: id,
  clickSecretKey: z.string().trim().max(200).optional(),
});

/** Saves the shop's own Payme/Click cashbox. Empty key fields keep the stored key. */
export const PUT = handler(async (req: Request) => {
  const { shop } = await requireApiShop();
  const input = await parseJson(req, schema);
  if (input.paymeEnabled && !input.paymeMerchantId) throw new ApiError(422, "payme_incomplete");
  if (input.clickEnabled && (!input.clickServiceId || !input.clickMerchantId)) throw new ApiError(422, "click_incomplete");
  const data = {
    paymeEnabled: input.paymeEnabled,
    paymeMerchantId: input.paymeMerchantId || null,
    paymeTestMode: input.paymeTestMode,
    clickEnabled: input.clickEnabled,
    clickServiceId: input.clickServiceId || null,
    clickMerchantId: input.clickMerchantId || null,
    ...(input.paymeKey ? { paymeKeyEnc: encrypt(input.paymeKey) } : {}),
    ...(input.clickSecretKey ? { clickSecretKeyEnc: encrypt(input.clickSecretKey) } : {}),
  };
  await db.shopPaymentConfig.upsert({ where: { shopId: shop.id }, update: data, create: { shopId: shop.id, ...data } });
  return Response.json({ ok: true });
});
