import "server-only";
import type { Plan, Shop } from "@prisma/client";
import { db } from "@/lib/db";
import { randomToken } from "@/lib/crypto";
import { getSetting } from "@/lib/settings";
import { currentPeriod } from "@/lib/utils/format";
import { slugify } from "@/lib/validation";

export const DEFAULT_PLANS = [
  { code: "start", name: "Start", priceUzs: 99_000, monthlyReplies: 1_000, instagram: false, webWidget: false, sortOrder: 1 },
  { code: "biznes", name: "Biznes", priceUzs: 199_000, monthlyReplies: 5_000, instagram: false, webWidget: false, sortOrder: 2 },
  { code: "pro", name: "Pro", priceUzs: 299_000, monthlyReplies: 20_000, instagram: true, webWidget: true, sortOrder: 3 },
] as const;

export async function ensurePlans(): Promise<void> {
  for (const p of DEFAULT_PLANS) {
    await db.plan.upsert({ where: { code: p.code }, update: {}, create: { ...p } });
  }
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base);
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? root : `${root}-${randomToken(3).toLowerCase().replace(/[^a-z0-9]/g, "")}`;
    const exists = await db.shop.findUnique({ where: { slug: candidate }, select: { id: true } });
    if (!exists) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

function referralCode(): string {
  return randomToken(6).replace(/[^A-Za-z0-9]/g, "").slice(0, 8).toUpperCase().padEnd(6, "X");
}

export async function createShop(ownerId: string, name: string, referralCodeUsed?: string | null) {
  const trial = await getSetting("trial_limits");
  const referrer = referralCodeUsed
    ? await db.shop.findUnique({ where: { referralCode: referralCodeUsed }, select: { id: true, ownerId: true } })
    : null;
  return db.shop.create({
    data: {
      ownerId,
      name,
      slug: await uniqueSlug(name),
      publicKey: `pk_${randomToken(18)}`,
      referralCode: referralCode(),
      // A user cannot refer themselves.
      referredById: referrer && referrer.ownerId !== ownerId ? referrer.id : null,
      trialEndsAt: new Date(Date.now() + trial.days * 86_400_000),
      subscriptionStatus: "TRIALING",
    },
  });
}

export type Entitlements = {
  active: boolean;
  reason: "ok" | "suspended" | "expired";
  status: "TRIALING" | "ACTIVE" | "EXPIRED";
  planName: string;
  planCode: string | null;
  monthlyReplies: number;
  instagram: boolean;
  webWidget: boolean;
  endsAt: Date;
};

/** What the shop may use right now. Computed from dates, so expiry needs no cron. */
export async function getEntitlements(shop: Shop & { plan?: Plan | null }): Promise<Entitlements> {
  const now = new Date();
  const plan = shop.plan ?? (shop.planId ? await db.plan.findUnique({ where: { id: shop.planId } }) : null);
  const paidActive = Boolean(shop.currentPeriodEnd && shop.currentPeriodEnd > now && plan);
  const trialActive = shop.trialEndsAt > now;

  if (paidActive && plan && shop.currentPeriodEnd) {
    return {
      active: shop.status === "ACTIVE",
      reason: shop.status === "ACTIVE" ? "ok" : "suspended",
      status: "ACTIVE",
      planName: plan.name,
      planCode: plan.code,
      monthlyReplies: plan.monthlyReplies,
      instagram: plan.instagram,
      webWidget: plan.webWidget,
      endsAt: shop.currentPeriodEnd,
    };
  }
  if (trialActive) {
    const trial = await getSetting("trial_limits");
    return {
      active: shop.status === "ACTIVE",
      reason: shop.status === "ACTIVE" ? "ok" : "suspended",
      status: "TRIALING",
      planName: "Trial",
      planCode: null,
      monthlyReplies: trial.monthlyReplies,
      instagram: trial.instagram,
      webWidget: trial.webWidget,
      endsAt: shop.trialEndsAt,
    };
  }
  return {
    active: false,
    reason: shop.status === "ACTIVE" ? "expired" : "suspended",
    status: "EXPIRED",
    planName: plan?.name ?? "Trial",
    planCode: plan?.code ?? null,
    monthlyReplies: 0,
    instagram: false,
    webWidget: false,
    endsAt: shop.currentPeriodEnd ?? shop.trialEndsAt,
  };
}

export async function getMonthlyUsage(shopId: string): Promise<number> {
  const row = await db.usageCounter.findUnique({ where: { shopId_period: { shopId, period: currentPeriod() } } });
  return row?.aiReplies ?? 0;
}

/** Atomically reserves one AI reply. Returns false if the monthly quota is used up. */
export async function consumeReply(shopId: string, limit: number): Promise<boolean> {
  if (limit <= 0) return false;
  const period = currentPeriod();
  const rows = await db.$queryRaw<{ aiReplies: number }[]>`
    INSERT INTO "UsageCounter" ("shopId", "period", "aiReplies", "updatedAt") VALUES (${shopId}, ${period}, 1, NOW())
    ON CONFLICT ("shopId", "period") DO UPDATE SET "aiReplies" = "UsageCounter"."aiReplies" + 1, "updatedAt" = NOW()
    WHERE "UsageCounter"."aiReplies" < ${limit}
    RETURNING "aiReplies"`;
  if (rows.length > 0) return Number(rows[0]?.aiReplies ?? 0) <= limit;
  return false;
}

/** Gives a reply back when the agent failed before answering. */
export async function refundReply(shopId: string): Promise<void> {
  await db.usageCounter.updateMany({
    where: { shopId, period: currentPeriod(), aiReplies: { gt: 0 } },
    data: { aiReplies: { decrement: 1 } },
  });
}
