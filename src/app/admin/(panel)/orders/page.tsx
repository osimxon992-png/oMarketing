import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { TrendChart } from "@/components/admin/trend-chart";
import { DataTable, Empty, Pager, Pills, SearchBox, Stat, StatGrid, TD, withQuery } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { adminContext } from "@/lib/admin/context";
import { oneOf, PAGE_SIZE, pageParam, searchParam, timeSeries } from "@/lib/admin/queries";
import { db } from "@/lib/db";
import { formatDateTime, formatNumber, formatUzs } from "@/lib/utils/format";

export const metadata = { title: "Orders" };

const STATUSES = ["NEW", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"] as const satisfies readonly OrderStatus[];
type Search = Promise<{ status?: string; q?: string; page?: string }>;

export default async function AdminOrdersPage({ searchParams }: { searchParams: Search }) {
  const { a, t, locale } = await adminContext();
  const o = a.orders;
  const sp = await searchParams;
  const status = oneOf(sp.status, STATUSES);
  const q = searchParam(sp.q);
  const page = pageParam(sp.page);

  const where: Prisma.OrderWhereInput = {
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { customerName: { contains: q, mode: "insensitive" } },
            { phone: { contains: q } },
            { shop: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, byStatus, totals, orders, series] = await Promise.all([
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], _count: true }),
    db.order.aggregate({ where: { status: { not: "CANCELLED" } }, _sum: { total: true, commissionAmount: true }, _count: true }),
    db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { shop: { select: { id: true, name: true } }, _count: { select: { items: true } } },
    }),
    timeSeries("orders", "day", 30),
  ]);

  const countOf = (s: OrderStatus) => byStatus.find((r) => r.status === s)?._count ?? 0;
  const allCount = byStatus.reduce((n, r) => n + r._count, 0);
  const href = (p: { status?: string; page?: number }) =>
    withQuery("/admin/orders", { status: p.status, q, page: p.page && p.page > 1 ? p.page : undefined });

  return (
    <>
      <PageHeader title={a.nav.orders} description={o.subtitle} />

      <StatGrid>
        <Stat label={a.common.total} value={formatNumber(allCount)} />
        <Stat label={o.gmv} value={formatUzs(totals._sum.total ?? 0, locale)} hint={`${a.common.count}: ${formatNumber(totals._count)}`} />
        <Stat label={o.commission} value={formatUzs(totals._sum.commissionAmount ?? 0, locale)} />
        <Stat label={t.status.NEW} value={formatNumber(countOf("NEW"))} href={href({ status: "NEW" })} />
      </StatGrid>

      <Card className="mt-4">
        <CardHeader title={o.chart} />
        <TrendChart data={series} />
      </Card>

      <Card className="mt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Pills
            items={[
              { label: a.common.all, href: href({}), active: !status, count: allCount },
              ...STATUSES.map((s) => ({ label: t.status[s], href: href({ status: s }), active: status === s, count: countOf(s) })),
            ]}
          />
          <SearchBox q={q} placeholder={o.searchPlaceholder} button={a.common.search} keep={{ status }} />
        </div>
        {orders.length === 0 ? (
          <Empty>{a.common.empty}</Empty>
        ) : (
          <DataTable
            minWidth={1150}
            columns={[o.number, a.common.shop, a.common.customer, o.source, o.delivery, a.common.amount, a.common.status, a.common.date, o.paidAt]}
          >
            {orders.map((order) => (
              <tr key={order.id}>
                <td className={`${TD} font-mono`}>#{order.number}</td>
                <td className={TD}>
                  <Link href={`/admin/shops/${order.shop.id}`} className="font-medium text-fg hover:underline">
                    {order.shop.name}
                  </Link>
                </td>
                <td className={TD}>
                  {order.conversationId ? (
                    <Link href={`/admin/conversations/${order.conversationId}`} className="text-fg hover:underline">
                      {order.customerName}
                    </Link>
                  ) : (
                    <p className="text-fg">{order.customerName}</p>
                  )}
                  <p className="text-xs text-subtle">{order.phone}</p>
                </td>
                <td className={`${TD} text-muted`}>{a.source[order.source]}</td>
                <td className={TD}>
                  <p className="text-fg">{a.delivery[order.deliveryType]}</p>
                  {order.deliveryAddress && <p className="max-w-[16rem] truncate text-xs text-subtle">{order.deliveryAddress}</p>}
                </td>
                <td className={`${TD} whitespace-nowrap`}>
                  <p className="font-mono text-fg">{formatUzs(order.total, locale)}</p>
                  <p className="text-xs text-subtle">
                    {order._count.items} × · {order.paymentProvider ?? "—"}
                  </p>
                </td>
                <td className={TD}>
                  <OrderStatusBadge status={order.status} label={t.status[order.status]} />
                </td>
                <td className={`${TD} whitespace-nowrap text-muted`}>{formatDateTime(order.createdAt, locale)}</td>
                <td className={`${TD} whitespace-nowrap text-muted`}>{order.paidAt ? formatDateTime(order.paidAt, locale) : "—"}</td>
              </tr>
            ))}
          </DataTable>
        )}
        <Pager page={page} total={total} pageSize={PAGE_SIZE} labels={a.common} href={(p) => href({ status, page: p })} />
      </Card>
    </>
  );
}
