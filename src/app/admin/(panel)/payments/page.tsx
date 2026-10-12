import Link from "next/link";
import type { InvoiceStatus, Prisma } from "@prisma/client";
import { TrendChart } from "@/components/admin/trend-chart";
import { DataTable, Empty, InvoiceBadge, Pager, Pills, SearchBox, Stat, StatGrid, TD, withQuery } from "@/components/admin/ui";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { adminContext } from "@/lib/admin/context";
import { oneOf, PAGE_SIZE, pageParam, searchParam, timeSeries } from "@/lib/admin/queries";
import { db } from "@/lib/db";
import { formatDateTime, formatNumber, formatUzs } from "@/lib/utils/format";
import { MarkPaidButton } from "../admin-actions";

export const metadata = { title: "Payments" };

const STATUSES = ["PENDING", "PAID", "CANCELLED"] as const satisfies readonly InvoiceStatus[];
type Search = Promise<{ status?: string; q?: string; page?: string }>;

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Search }) {
  const { a, locale } = await adminContext();
  const sp = await searchParams;
  const status = oneOf(sp.status, STATUSES);
  const q = searchParam(sp.q);
  const page = pageParam(sp.page);

  const where: Prisma.BillingInvoiceWhereInput = {
    ...(status ? { status } : {}),
    ...(q ? { shop: { name: { contains: q, mode: "insensitive" } } } : {}),
  };

  const [total, byStatus, invoices, revenueSeries] = await Promise.all([
    db.billingInvoice.count({ where }),
    db.billingInvoice.groupBy({ by: ["status"], _count: true, _sum: { amount: true } }),
    db.billingInvoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { plan: { select: { name: true } }, shop: { select: { id: true, name: true, owner: { select: { name: true } } } } },
    }),
    timeSeries("revenue", "month", 12),
  ]);

  const stat = (s: InvoiceStatus) => byStatus.find((r) => r.status === s);
  const allCount = byStatus.reduce((n, r) => n + r._count, 0);
  const href = (p: { status?: string; page?: number }) =>
    withQuery("/admin/payments", { status: p.status, q, page: p.page && p.page > 1 ? p.page : undefined });

  return (
    <>
      <PageHeader title={a.nav.payments} description={a.payments.subtitle} />

      <StatGrid className="xl:grid-cols-3">
        {STATUSES.map((s) => (
          <Stat
            key={s}
            label={a.invoiceStatus[s]}
            value={formatUzs(stat(s)?._sum.amount ?? 0, locale)}
            hint={`${a.common.count}: ${formatNumber(stat(s)?._count ?? 0)}`}
            href={href({ status: s })}
          />
        ))}
      </StatGrid>

      <Card className="mt-4">
        <CardHeader title={a.payments.revenueChart} />
        <TrendChart data={revenueSeries} format="uzs" />
      </Card>

      <Card className="mt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Pills
            items={[
              { label: a.common.all, href: href({}), active: !status, count: allCount },
              ...STATUSES.map((s) => ({ label: a.invoiceStatus[s], href: href({ status: s }), active: status === s, count: stat(s)?._count ?? 0 })),
            ]}
          />
          <SearchBox q={q} placeholder={a.common.shop} button={a.common.search} keep={{ status }} />
        </div>
        {invoices.length === 0 ? (
          <Empty>{a.common.empty}</Empty>
        ) : (
          <DataTable
            minWidth={1000}
            columns={[a.common.created, a.common.shop, a.common.plan, a.common.amount, a.common.status, a.payments.provider, a.payments.paidAt, ""]}
          >
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td className={`${TD} whitespace-nowrap text-muted`}>{formatDateTime(inv.createdAt, locale)}</td>
                <td className={TD}>
                  <Link href={`/admin/shops/${inv.shop.id}`} className="font-medium text-fg hover:underline">
                    {inv.shop.name}
                  </Link>
                  <p className="text-xs text-subtle">{inv.shop.owner.name}</p>
                </td>
                <td className={TD}>
                  {inv.plan.name} · {inv.months} {a.common.months}
                </td>
                <td className={`${TD} font-mono whitespace-nowrap text-fg`}>{formatUzs(inv.amount, locale)}</td>
                <td className={TD}>
                  <InvoiceBadge status={inv.status} label={a.invoiceStatus[inv.status]} />
                </td>
                <td className={`${TD} text-muted`}>{inv.provider ?? "—"}</td>
                <td className={`${TD} whitespace-nowrap text-muted`}>{inv.paidAt ? formatDateTime(inv.paidAt, locale) : "—"}</td>
                <td className={`${TD} text-right`}>{inv.status === "PENDING" && <MarkPaidButton invoiceId={inv.id} />}</td>
              </tr>
            ))}
          </DataTable>
        )}
        <Pager page={page} total={total} pageSize={PAGE_SIZE} labels={a.common} href={(p) => href({ status, page: p })} />
      </Card>
    </>
  );
}
