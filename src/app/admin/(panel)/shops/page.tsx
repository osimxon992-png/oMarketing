import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { DataTable, Empty, EndsAt, Pager, Pills, SearchBox, SubscriptionBadge, TD, withQuery } from "@/components/admin/ui";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { adminContext } from "@/lib/admin/context";
import { oneOf, PAGE_SIZE, pageParam, searchParam, subscriptionOf, subscriptionWhere } from "@/lib/admin/queries";
import { db } from "@/lib/db";
import { currentPeriod, formatDate, formatNumber, formatUzs } from "@/lib/utils/format";
import { ShopStatusButton } from "../admin-actions";

export const metadata = { title: "Shops" };

const FILTERS = ["paid", "trial", "expired", "suspended"] as const;
type Search = Promise<{ f?: string; q?: string; page?: string }>;

export default async function AdminShopsPage({ searchParams }: { searchParams: Search }) {
  const { a, locale, now } = await adminContext();
  const s = a.shops;
  const sp = await searchParams;
  const filter = oneOf(sp.f, FILTERS);
  const q = searchParam(sp.q);
  const page = pageParam(sp.page);

  const sub = subscriptionWhere(now);
  const byFilter: Record<(typeof FILTERS)[number], Prisma.ShopWhereInput> = { ...sub, suspended: { status: "SUSPENDED" } };
  const search: Prisma.ShopWhereInput = q
    ? {
        OR: [
          { name: { contains: q, mode: "insensitive" } },
          { slug: { contains: q, mode: "insensitive" } },
          { owner: { name: { contains: q, mode: "insensitive" } } },
          { owner: { email: { contains: q, mode: "insensitive" } } },
          { owner: { telegramUsername: { contains: q.replace(/^@/, ""), mode: "insensitive" } } },
        ],
      }
    : {};
  const where: Prisma.ShopWhereInput = { AND: [filter ? byFilter[filter] : {}, search] };
  const orderBy: Prisma.ShopOrderByWithRelationInput =
    filter === "trial" ? { trialEndsAt: "asc" } : filter === "paid" ? { currentPeriodEnd: "asc" } : { createdAt: "desc" };

  const [total, counts, shops] = await Promise.all([
    db.shop.count({ where }),
    Promise.all([db.shop.count(), ...FILTERS.map((f) => db.shop.count({ where: byFilter[f] }))]),
    db.shop.findMany({
      where,
      orderBy,
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        owner: { select: { name: true, email: true, telegramUsername: true } },
        plan: { select: { name: true } },
        usageCounters: { where: { period: currentPeriod(now) }, select: { aiReplies: true } },
        _count: { select: { products: true, orders: true, conversations: true, channels: true } },
      },
    }),
  ]);

  const paidByShop = new Map(
    (
      await db.billingInvoice.groupBy({
        by: ["shopId"],
        where: { status: "PAID", shopId: { in: shops.map((x) => x.id) } },
        _sum: { amount: true },
      })
    ).map((r) => [r.shopId, r._sum.amount ?? 0]),
  );

  const labels = { paid: a.sub.paid, trial: a.sub.trial, expired: a.sub.expired, suspended: a.sub.suspended };
  const href = (p: { f?: string; page?: number }) => withQuery("/admin/shops", { f: p.f, q, page: p.page && p.page > 1 ? p.page : undefined });

  return (
    <>
      <PageHeader title={a.nav.shops} description={s.subtitle} />
      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Pills
            items={[
              { label: a.common.all, href: href({}), active: !filter, count: counts[0] },
              ...FILTERS.map((f, i) => ({ label: labels[f], href: href({ f }), active: filter === f, count: counts[i + 1] })),
            ]}
          />
          <SearchBox q={q} placeholder={s.searchPlaceholder} button={a.common.search} keep={{ f: filter }} />
        </div>

        {shops.length === 0 ? (
          <Empty>{a.common.empty}</Empty>
        ) : (
          <DataTable
            minWidth={1250}
            columns={[
              a.common.shop,
              a.common.owner,
              a.common.plan,
              s.endsAt,
              s.totalPaid,
              s.products,
              s.orders,
              s.conversations,
              s.aiReplies,
              s.channels,
              a.common.status,
              "",
            ]}
          >
            {shops.map((shop) => {
              const st = subscriptionOf(shop, now);
              const paid = paidByShop.get(shop.id) ?? 0;
              return (
                <tr key={shop.id}>
                  <td className={TD}>
                    <Link href={`/admin/shops/${shop.id}`} className="font-medium text-fg hover:underline">
                      {shop.name}
                    </Link>
                    <p className="text-xs text-subtle">
                      /{shop.slug} · {formatDate(shop.createdAt, locale)}
                    </p>
                  </td>
                  <td className={TD}>
                    <p className="text-fg">{shop.owner.name}</p>
                    <p className="text-xs text-subtle">
                      {shop.owner.email ?? (shop.owner.telegramUsername ? `@${shop.owner.telegramUsername}` : "")}
                    </p>
                  </td>
                  <td className={TD}>
                    <p className="mb-1 text-fg">{st.state === "paid" ? shop.plan?.name : "—"}</p>
                    <SubscriptionBadge state={st.state} label={a.sub[st.state]} />
                  </td>
                  <td className={TD}>
                    <EndsAt end={st.endsAt} now={now} locale={locale} labels={a.common} />
                  </td>
                  <td className={`${TD} font-mono whitespace-nowrap text-fg`}>{paid > 0 ? formatUzs(paid, locale) : "—"}</td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(shop._count.products)}</td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(shop._count.orders)}</td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(shop._count.conversations)}</td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(shop.usageCounters[0]?.aiReplies ?? 0)}</td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(shop._count.channels)}</td>
                  <td className={TD}>
                    <Badge tone={shop.status === "ACTIVE" ? "success" : "danger"}>{a.shopStatus[shop.status]}</Badge>
                  </td>
                  <td className={`${TD} text-right`}>
                    <ShopStatusButton shopId={shop.id} status={shop.status} />
                  </td>
                </tr>
              );
            })}
          </DataTable>
        )}
        <Pager page={page} total={total} pageSize={PAGE_SIZE} labels={a.common} href={(p) => href({ f: filter, page: p })} />
      </Card>
    </>
  );
}
