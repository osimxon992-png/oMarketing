import "server-only";
import { Prisma, type Shop } from "@prisma/client";
import { db } from "@/lib/db";
import { TZ } from "@/lib/utils/format";

export const DAY = 86_400_000;
export const PAGE_SIZE = 50;

export type SubState = "paid" | "trial" | "expired";

// Same rules as getEntitlements(): the stored subscriptionStatus is not kept in sync, dates are the truth.
export function subscriptionWhere(now: Date): Record<SubState, Prisma.ShopWhereInput> {
  const notPaid: Prisma.ShopWhereInput[] = [{ planId: null }, { currentPeriodEnd: null }, { currentPeriodEnd: { lte: now } }];
  return {
    paid: { planId: { not: null }, currentPeriodEnd: { gt: now } },
    trial: { trialEndsAt: { gt: now }, OR: notPaid },
    expired: { trialEndsAt: { lte: now }, OR: notPaid },
  };
}

export function subscriptionOf(s: Pick<Shop, "planId" | "currentPeriodEnd" | "trialEndsAt">, now: Date) {
  if (s.planId && s.currentPeriodEnd && s.currentPeriodEnd > now) return { state: "paid" as const, endsAt: s.currentPeriodEnd };
  if (s.trialEndsAt > now) return { state: "trial" as const, endsAt: s.trialEndsAt };
  return { state: "expired" as const, endsAt: s.currentPeriodEnd ?? s.trialEndsAt };
}

/** `?page=` → 1-based page number. */
export function pageParam(v: string | string[] | undefined): number {
  const n = Number(Array.isArray(v) ? v[0] : v);
  return Number.isInteger(n) && n > 1 && n < 100_000 ? n : 1;
}

/** `?q=` → trimmed search text, or undefined. */
export function searchParam(v: string | string[] | undefined): string | undefined {
  const q = (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 100);
  return q || undefined;
}

/** A query value restricted to a fixed set (filters, tabs). */
export function oneOf<T extends string>(v: string | string[] | undefined, allowed: readonly T[]): T | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  return allowed.includes(s as T) ? (s as T) : undefined;
}

// Whitelisted sources for time series. Table/column names never come from user input.
const SERIES = {
  signups: { table: `"User"`, time: `"createdAt"`, value: `COUNT(t.id)`, filter: ``, shopScoped: false },
  revenue: { table: `"BillingInvoice"`, time: `"paidAt"`, value: `SUM(t.amount)`, filter: `AND t.status = 'PAID'`, shopScoped: true },
  orders: { table: `"Order"`, time: `"createdAt"`, value: `COUNT(t.id)`, filter: `AND t.status <> 'CANCELLED'`, shopScoped: true },
  messages: { table: `"Message"`, time: `"createdAt"`, value: `COUNT(t.id)`, filter: ``, shopScoped: true },
  aiCost: { table: `"AiUsage"`, time: `"createdAt"`, value: `SUM(t."costMicroUsd")`, filter: ``, shopScoped: true },
} as const;

export type SeriesKind = keyof typeof SERIES;
export type SeriesPoint = { key: string; value: number };

/**
 * One value per day (last `count` days) or month (last `count` months) in Tashkent time,
 * empty buckets included as 0. Keys: YYYY-MM-DD or YYYY-MM.
 */
export async function timeSeries(kind: SeriesKind, unit: "day" | "month", count: number, shopId?: string): Promise<SeriesPoint[]> {
  const src = SERIES[kind];
  if (shopId && !src.shopScoped) throw new Error(`series ${kind} is not per-shop`);
  const n = Math.max(1, Math.trunc(count));
  const step = Prisma.raw(unit === "day" ? `interval '1 day'` : `interval '1 month'`);
  const unitSql = Prisma.raw(`'${unit}'`);
  const tz = Prisma.raw(`'${TZ}'`);
  const format = Prisma.raw(unit === "day" ? `'YYYY-MM-DD'` : `'YYYY-MM'`);
  const time = Prisma.raw(`t.${src.time}`);
  const shopFilter = shopId ? Prisma.sql`AND t."shopId" = ${shopId}` : Prisma.empty;
  // Columns are timestamp(3) in UTC: shift to Tashkent for bucketing; the lower bound goes back to UTC so indexes apply.
  const rows = await db.$queryRaw<SeriesPoint[]>`
    WITH b AS (
      SELECT generate_series(
        date_trunc(${unitSql}, now() AT TIME ZONE ${tz}) - (${n - 1}::int * ${step}),
        date_trunc(${unitSql}, now() AT TIME ZONE ${tz}),
        ${step}
      ) AS bucket
    )
    SELECT to_char(b.bucket, ${format}) AS key, COALESCE(${Prisma.raw(src.value)}, 0)::float8 AS value
    FROM b
    LEFT JOIN ${Prisma.raw(src.table)} t
      ON date_trunc(${unitSql}, (${time} AT TIME ZONE 'UTC') AT TIME ZONE ${tz}) = b.bucket
      AND ${time} >= ((SELECT min(bucket) FROM b) AT TIME ZONE ${tz}) AT TIME ZONE 'UTC'
      ${Prisma.raw(src.filter)} ${shopFilter}
    GROUP BY b.bucket
    ORDER BY b.bucket`;
  return rows.map((r) => ({ key: r.key, value: Number(r.value) }));
}
