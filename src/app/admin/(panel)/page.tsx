import Link from "next/link";
import { TrendChart } from "@/components/admin/trend-chart";
import { EndsAt, Empty, SectionTitle, Stat, StatGrid } from "@/components/admin/ui";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { adminContext } from "@/lib/admin/context";
import { DAY, subscriptionWhere, timeSeries } from "@/lib/admin/queries";
import { db } from "@/lib/db";
import { formatDate, formatNumber, formatUsd, formatUzs } from "@/lib/utils/format";
import { MarkPaidButton } from "./admin-actions";

export default async function AdminOverviewPage() {
  const { a, locale, now, monthStart } = await adminContext();
  const o = a.overview;
  const where = subscriptionWhere(now);
  const weekAgo = new Date(now.getTime() - 7 * DAY);
  const monthAgo = new Date(now.getTime() - 30 * DAY);

  const [
    users,
    usersWeek,
    shops,
    paid,
    trial,
    endingSoonCount,
    expired,
    suspended,
    revenue,
    revenueMonth,
    pending,
    paidPlans,
    orders,
    gmv,
    conversations,
    messages30,
    aiMonth,
    channelsActive,
    channelErrors,
  ] = await Promise.all([
    db.user.count(),
    db.user.count({ where: { createdAt: { gte: weekAgo } } }),
    db.shop.count(),
    db.shop.count({ where: where.paid }),
    db.shop.count({ where: where.trial }),
    db.shop.count({ where: { ...where.trial, trialEndsAt: { gt: now, lte: new Date(now.getTime() + 7 * DAY) } } }),
    db.shop.count({ where: where.expired }),
    db.shop.count({ where: { status: "SUSPENDED" } }),
    db.billingInvoice.aggregate({ where: { status: "PAID" }, _sum: { amount: true } }),
    db.billingInvoice.aggregate({ where: { status: "PAID", paidAt: { gte: monthStart } }, _sum: { amount: true } }),
    db.billingInvoice.aggregate({ where: { status: "PENDING" }, _sum: { amount: true }, _count: true }),
    db.shop.findMany({ where: where.paid, select: { plan: { select: { priceUzs: true } } } }),
    db.order.count(),
    db.order.aggregate({ where: { status: { not: "CANCELLED" } }, _sum: { total: true } }),
    db.conversation.count(),
    db.message.count({ where: { createdAt: { gte: monthAgo } } }),
    db.aiUsage.aggregate({ where: { createdAt: { gte: monthStart } }, _sum: { costMicroUsd: true } }),
    db.channel.count({ where: { status: "ACTIVE" } }),
    db.channel.count({ where: { status: "ERROR" } }),
  ]);

  const [signupsSeries, revenueSeries, messagesSeries, ordersSeries, endingSoon, pendingInvoices, recentUsers] = await Promise.all([
    timeSeries("signups", "day", 30),
    timeSeries("revenue", "month", 12),
    timeSeries("messages", "day", 30),
    timeSeries("orders", "day", 30),
    db.shop.findMany({
      where: { ...where.trial, trialEndsAt: { gt: now, lte: new Date(now.getTime() + 7 * DAY) } },
      orderBy: { trialEndsAt: "asc" },
      take: 10,
      include: { owner: { select: { name: true, email: true, telegramUsername: true } } },
    }),
    db.billingInvoice.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 10,
      include: { plan: { select: { name: true } }, shop: { select: { id: true, name: true } } },
    }),
    db.user.findMany({ orderBy: { createdAt: "desc" }, take: 10, include: { shops: { select: { id: true, name: true } } } }),
  ]);

  const mrr = paidPlans.reduce((sum, s) => sum + (s.plan?.priceUzs ?? 0), 0);

  return (
    <>
      <PageHeader title={a.title} description={o.subtitle} />

      <SectionTitle>{o.subscriptions}</SectionTitle>
      <StatGrid className="2xl:grid-cols-7">
        <Stat label={o.users} value={formatNumber(users)} hint={`+${formatNumber(usersWeek)} ${a.common.last7}`} href="/admin/users" />
        <Stat label={o.shops} value={formatNumber(shops)} href="/admin/shops" />
        <Stat label={o.paidShops} value={formatNumber(paid)} href="/admin/shops?f=paid" />
        <Stat label={o.trialShops} value={formatNumber(trial)} href="/admin/shops?f=trial" />
        <Stat label={o.endingSoon} value={formatNumber(endingSoonCount)} href="/admin/shops?f=trial" />
        <Stat label={o.expiredShops} value={formatNumber(expired)} href="/admin/shops?f=expired" />
        <Stat label={o.suspendedShops} value={formatNumber(suspended)} href="/admin/shops?f=suspended" />
      </StatGrid>

      <SectionTitle>{o.money}</SectionTitle>
      <StatGrid>
        <Stat label={o.revenue} value={formatUzs(revenue._sum.amount ?? 0, locale)} href="/admin/payments?status=PAID" />
        <Stat label={o.revenueMonth} value={formatUzs(revenueMonth._sum.amount ?? 0, locale)} />
        <Stat label={o.mrr} value={formatUzs(mrr, locale)} hint={o.mrrHint} />
        <Stat
          label={o.pending}
          value={formatNumber(pending._count)}
          hint={formatUzs(pending._sum.amount ?? 0, locale)}
          href="/admin/payments?status=PENDING"
        />
      </StatGrid>

      <SectionTitle>{o.activity}</SectionTitle>
      <StatGrid className="2xl:grid-cols-6">
        <Stat label={o.orders} value={formatNumber(orders)} href="/admin/orders" />
        <Stat label={o.gmv} value={formatUzs(gmv._sum.total ?? 0, locale)} />
        <Stat label={o.conversations} value={formatNumber(conversations)} href="/admin/conversations" />
        <Stat label={o.messages30} value={formatNumber(messages30)} />
        <Stat label={o.aiCostMonth} value={formatUsd(aiMonth._sum.costMicroUsd ?? 0)} href="/admin/ai" />
        <Stat
          label={o.channelsActive}
          value={formatNumber(channelsActive)}
          hint={channelErrors > 0 ? `${o.channelErrors}: ${channelErrors}` : undefined}
          href="/admin/channels"
        />
      </StatGrid>

      <div className="mt-8 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={o.signupsChart} />
          <TrendChart data={signupsSeries} />
        </Card>
        <Card>
          <CardHeader title={o.revenueChart} />
          <TrendChart data={revenueSeries} format="uzs" />
        </Card>
        <Card>
          <CardHeader title={o.messagesChart} />
          <TrendChart data={messagesSeries} />
        </Card>
        <Card>
          <CardHeader title={o.ordersChart} />
          <TrendChart data={ordersSeries} />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card>
          <CardHeader title={o.endingSoonList} action={<SeeAll href="/admin/shops?f=trial" label={a.common.seeAll} />} />
          {endingSoon.length === 0 ? (
            <Empty>{o.noEndingSoon}</Empty>
          ) : (
            <ul className="divide-y divide-[var(--glass-border)]">
              {endingSoon.map((s) => (
                <li key={s.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                  <div className="min-w-0">
                    <Link href={`/admin/shops/${s.id}`} className="font-medium text-fg hover:underline">
                      {s.name}
                    </Link>
                    <p className="truncate text-xs text-subtle">
                      {s.owner.name} · {s.owner.email ?? (s.owner.telegramUsername ? `@${s.owner.telegramUsername}` : "—")}
                    </p>
                  </div>
                  <div className="text-right">
                    <EndsAt end={s.trialEndsAt} now={now} locale={locale} labels={a.common} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={o.pending} action={<SeeAll href="/admin/payments?status=PENDING" label={a.common.seeAll} />} />
          {pendingInvoices.length === 0 ? (
            <Empty>{o.noPending}</Empty>
          ) : (
            <ul className="divide-y divide-[var(--glass-border)]">
              {pendingInvoices.map((inv) => (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/shops/${inv.shop.id}`} className="font-medium text-fg hover:underline">
                      {inv.shop.name}
                    </Link>
                    <p className="text-xs text-subtle">
                      {inv.plan.name} · {inv.months} {a.common.months} · {formatDate(inv.createdAt, locale)}
                    </p>
                  </div>
                  <span className="font-mono text-fg">{formatUzs(inv.amount, locale)}</span>
                  <MarkPaidButton invoiceId={inv.id} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader title={o.recentUsers} action={<SeeAll href="/admin/users" label={a.common.seeAll} />} />
          <ul className="divide-y divide-[var(--glass-border)]">
            {recentUsers.map((u) => (
              <li key={u.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-medium text-fg">{u.name}</p>
                  <p className="truncate text-xs text-subtle">
                    {u.email ?? (u.telegramUsername ? `@${u.telegramUsername}` : "—")}
                    {u.shops.length > 0 && ` · ${u.shops.map((s) => s.name).join(", ")}`}
                  </p>
                </div>
                <span className="text-xs whitespace-nowrap text-subtle">{formatDate(u.createdAt, locale)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}

function SeeAll({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-xs font-medium text-muted hover:text-fg">
      {label} →
    </Link>
  );
}
