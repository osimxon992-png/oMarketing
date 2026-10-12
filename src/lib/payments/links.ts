import "server-only";
import type { ShopPaymentConfig } from "@prisma/client";

/**
 * Hosted checkout links for Payme and Click. Both take the amount in so'm here;
 * Payme expects tiyin (×100). Confirming the payment needs the provider's
 * merchant callbacks; until those are wired, the seller marks the order paid.
 */
export function paymeLink(merchantId: string, orderId: string, amountUzs: number, testMode: boolean, returnUrl?: string): string {
  const params = [`m=${merchantId}`, `ac.order_id=${orderId}`, `a=${Math.round(amountUzs * 100)}`];
  if (returnUrl) params.push(`c=${returnUrl}`);
  const host = testMode ? "https://checkout.test.paycom.uz" : "https://checkout.paycom.uz";
  return `${host}/${Buffer.from(params.join(";")).toString("base64")}`;
}

export function clickLink(serviceId: string, merchantId: string, orderId: string, amountUzs: number, returnUrl?: string): string {
  const q = new URLSearchParams({
    service_id: serviceId,
    merchant_id: merchantId,
    amount: String(amountUzs),
    transaction_param: orderId,
  });
  if (returnUrl) q.set("return_url", returnUrl);
  return `https://my.click.uz/services/pay?${q}`;
}

/** Links for every provider the shop has enabled. */
export function orderPaymentLinks(config: ShopPaymentConfig | null, orderId: string, amountUzs: number) {
  const links: { provider: "payme" | "click"; url: string }[] = [];
  if (config?.paymeEnabled && config.paymeMerchantId) {
    links.push({ provider: "payme", url: paymeLink(config.paymeMerchantId, orderId, amountUzs, config.paymeTestMode) });
  }
  if (config?.clickEnabled && config.clickServiceId && config.clickMerchantId) {
    links.push({ provider: "click", url: clickLink(config.clickServiceId, config.clickMerchantId, orderId, amountUzs) });
  }
  return links;
}
