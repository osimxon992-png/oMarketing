import "server-only";
import { db } from "@/lib/db";

export type SetupStatus = {
  shop: boolean;
  products: boolean;
  channel: boolean;
  payment: boolean;
  tested: boolean;
  live: boolean;
  productCount: number;
};

export async function getSetupStatus(shopId: string): Promise<SetupStatus> {
  const [shop, productCount, channelCount, pay, tested] = await Promise.all([
    db.shop.findUniqueOrThrow({ where: { id: shopId }, select: { onboardingCompleted: true } }),
    db.product.count({ where: { shopId } }),
    db.channel.count({ where: { shopId, status: "ACTIVE" } }),
    db.shopPaymentConfig.findUnique({ where: { shopId }, select: { paymeEnabled: true, clickEnabled: true } }),
    db.conversation.count({ where: { shopId, channel: "PLAYGROUND", messageCount: { gt: 1 } } }),
  ]);
  return {
    shop: true,
    products: productCount > 0,
    channel: channelCount > 0,
    payment: Boolean(pay?.paymeEnabled || pay?.clickEnabled),
    tested: tested > 0,
    live: shop.onboardingCompleted,
    productCount,
  };
}
