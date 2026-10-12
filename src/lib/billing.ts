import "server-only";
import type { BillingInvoice } from "@prisma/client";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { clickLink, paymeLink } from "@/lib/payments/links";
import { getSetting } from "@/lib/settings";
import { formatUzs } from "@/lib/utils/format";

const DAY = 86_400_000;

export type InvoiceLink = { provider: "telegram" | "payme" | "click"; url: string };

/**
 * Ways to pay a subscription invoice. Telegram comes first: it opens a chat with the
 * platform owner, prefilled with the invoice details; the owner confirms it in /admin.
 * Payme and Click are added only when configured in env.
 */
export function invoicePaymentLinks(
  invoice: Pick<BillingInvoice, "id" | "amount" | "months">,
  ctx: { shopName: string; planName: string },
): InvoiceLink[] {
  const e = env();
  const text = [
    "Assalomu alaykum! oMarketing obunasi uchun to'lov qilmoqchiman.",
    `Do'kon: ${ctx.shopName}`,
    `Tarif: ${ctx.planName} · ${invoice.months} oy`,
    `Summa: ${formatUzs(invoice.amount)}`,
    `Hisob: ${invoice.id}`,
  ].join("\n");
  const links: InvoiceLink[] = [{ provider: "telegram", url: `https://t.me/${e.PLATFORM_PAY_TELEGRAM}?text=${encodeURIComponent(text)}` }];
  if (e.PLATFORM_PAYME_MERCHANT_ID && e.PLATFORM_PAYME_KEY) {
    links.push({ provider: "payme", url: paymeLink(e.PLATFORM_PAYME_MERCHANT_ID, invoice.id, invoice.amount, e.PLATFORM_PAYME_TEST_MODE) });
  }
  if (e.PLATFORM_CLICK_SERVICE_ID && e.PLATFORM_CLICK_MERCHANT_ID) {
    links.push({ provider: "click", url: clickLink(e.PLATFORM_CLICK_SERVICE_ID, e.PLATFORM_CLICK_MERCHANT_ID, invoice.id, invoice.amount) });
  }
  return links;
}

/** Extends whichever period is running (paid or trial) by `days`. */
async function addBonusDays(shopId: string, days: number) {
  const shop = await db.shop.findUniqueOrThrow({ where: { id: shopId } });
  const now = Date.now();
  if (shop.currentPeriodEnd && shop.currentPeriodEnd.getTime() > now) {
    await db.shop.update({ where: { id: shopId }, data: { currentPeriodEnd: new Date(shop.currentPeriodEnd.getTime() + days * DAY) } });
  } else {
    await db.shop.update({ where: { id: shopId }, data: { trialEndsAt: new Date(Math.max(shop.trialEndsAt.getTime(), now) + days * DAY) } });
  }
}

/** Marks an invoice paid, activates/extends the plan and pays out the referral bonus once. */
export async function markInvoicePaid(invoiceId: string, provider = "manual") {
  const invoice = await db.billingInvoice.findUniqueOrThrow({ where: { id: invoiceId }, include: { shop: true } });
  if (invoice.status === "PAID") return invoice;
  const shop = invoice.shop;
  const now = Date.now();
  const base = shop.currentPeriodEnd && shop.currentPeriodEnd.getTime() > now ? shop.currentPeriodEnd.getTime() : now;
  const updated = await db.$transaction(async (tx) => {
    const inv = await tx.billingInvoice.update({ where: { id: invoice.id }, data: { status: "PAID", paidAt: new Date(), provider } });
    await tx.shop.update({
      where: { id: shop.id },
      data: { planId: invoice.planId, subscriptionStatus: "ACTIVE", currentPeriodEnd: new Date(base + invoice.months * 30 * DAY) },
    });
    return inv;
  });

  if (shop.referredById && !shop.referralRewardedAt) {
    const days = await getSetting("referral_bonus_days");
    if (days > 0) {
      await addBonusDays(shop.id, days);
      await addBonusDays(shop.referredById, days);
    }
    await db.shop.update({ where: { id: shop.id }, data: { referralRewardedAt: new Date() } });
  }
  return updated;
}
