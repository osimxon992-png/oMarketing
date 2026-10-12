import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { TrendChart } from "@/components/admin/trend-chart";
import { DataTable, Empty, EndsAt, Facts, InvoiceBadge, SubscriptionBadge, TD } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/dashboard/status-badge";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/card";
import { adminContext } from "@/lib/admin/context";
import { subscriptionOf, timeSeries } from "@/lib/admin/queries";
import { db } from "@/lib/db";
import { getEntitlements } from "@/lib/shop";
import { currentPeriod, formatDate, formatDateTime, formatNumber, formatUsd, formatUzs } from "@/lib/utils/format";
import { MarkPaidButton, ShopStatusButton } from "../../admin-actions";

export const metadata = { title: "Shop" };

export default async function AdminShopPage({ params }: { params: Promise<{ id: string }> }) {
  const { a, t, locale, now, monthStart } = await adminContext();
  const s = a.shop;
  const { id } = await params;

  const shop = await db.shop.findUnique({
    where: { id },
    include: {
      owner: true,
      plan: true,
      referredBy: { select: { id: true, name: true } },
      referrals: { select: { id: true, name: true, createdAt: true }, orderBy: { createdAt: "desc" } },
      paymentConfig: { select: { paymeEnabled: true, paymeTestMode: true, clickEnabled: true } },
      channels: { orderBy: { createdAt: "desc" }, include: { _count: { select: { conversations: true, businessConnections: true } } } },
      invoices: { orderBy: { createdAt: "desc" }, include: { plan: { select: { name: true } } } },
      _count: { select: { products: true, customers: true, conversations: true, messages: true, orders: true } },
    },
  });
  if (!shop) notFound();

  const [ent, activeProducts, gmv, usage, aiTotal, aiMonth, toolErrors, orders, conversations, products, messagesSeries] = await Promise.all([
    getEntitlements(shop),
    db.product.count({ where: { shopId: id, active: true } }),
    db.order.aggregate({ where: { shopId: id, status: { not: "CANCELLED" } }, _sum: { total: true } }),
    db.usageCounter.findUnique({ where: { shopId_period: { shopId: id, period: currentPeriod(now) } } }),
    db.aiUsage.aggregate({ where: { shopId: id }, _sum: { costMicroUsd: true } }),
    db.aiUsage.aggregate({ where: { shopId: id, createdAt: { gte: monthStart } }, _sum: { costMicroUsd: true } }),
    db.aiToolCall.count({ where: { shopId: id, isError: true } }),
    db.order.findMany({ where: { shopId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
    db.conversation.findMany({
      where: { shopId: id },
      orderBy: { lastMessageAt: "desc" },
      take: 10,
      include: { customer: { select: { name: true, username: true } } },
    }),
    db.product.findMany({ where: { shopId: id }, orderBy: { createdAt: "desc" }, take: 10 }),
    timeSeries("messages", "day", 30, id),
  ]);

  const st = subscriptionOf(shop, now);
  const owner = shop.owner;
  const text = (v: string) => (v.trim() ? <span className="whitespace-pre-wrap">{v}</span> : "—");

  return (
    <>
      <Link href="/admin/shops" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> {s.back}
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {shop.name}
            <SubscriptionBadge state={st.state} label={a.sub[st.state]} />
            <Badge tone={shop.status === "ACTIVE" ? "success" : "danger"}>{a.shopStatus[shop.status]}</Badge>
            {shop.isDemo && <Badge>{s.demo}</Badge>}
          </span>
        }
        description={`/${shop.slug} · ${a.common.created}: ${formatDateTime(shop.createdAt, locale)}`}
        action={<ShopStatusButton shopId={shop.id} status={shop.status} />}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={s.owner} />
          <Facts
            items={[
              [a.users.name, owner.name],
              ["Email", owner.email],
              ["Telegram", owner.telegramUsername ? `@${owner.telegramUsername}` : owner.telegramId ? String(owner.telegramId) : null],
              [a.users.notifier, owner.notifyChatId ? a.common.yes : a.common.no],
              [a.users.locale, owner.locale.toUpperCase()],
              [a.users.registered, formatDateTime(owner.createdAt, locale)],
            ]}
          />
        </Card>

        <Card>
          <CardHeader title={s.subscription} />
          <Facts
            items={[
              [a.common.status, <SubscriptionBadge key="s" state={st.state} label={a.sub[st.state]} />],
              [a.common.plan, shop.plan?.name ?? "—"],
              [s.trialEndsAt, <EndsAt key="t" end={shop.trialEndsAt} now={now} locale={locale} labels={a.common} />],
              [s.periodEnd, shop.currentPeriodEnd ? <EndsAt key="p" end={shop.currentPeriodEnd} now={now} locale={locale} labels={a.common} /> : "—"],
              [s.referralCode, <span key="r" className="font-mono">{shop.referralCode}</span>],
              [
                s.referredBy,
                shop.referredBy ? (
                  <Link key="b" href={`/admin/shops/${shop.referredBy.id}`} className="hover:underline">
                    {shop.referredBy.name}
                  </Link>
                ) : null,
              ],
              [s.rewarded, shop.referralRewardedAt ? formatDate(shop.referralRewardedAt, locale) : "—"],
              [
                `${s.referrals} (${shop.referrals.length})`,
                shop.referrals.length ? (
                  <span key="rs" className="flex flex-col gap-0.5">
                    {shop.referrals.map((r) => (
                      <Link key={r.id} href={`/admin/shops/${r.id}`} className="hover:underline">
                        {r.name}
                      </Link>
                    ))}
                  </span>
                ) : null,
              ],
            ]}
          />
        </Card>

        <Card>
          <CardHeader title={s.stats} />
          <Facts
            items={[
              [s.products, `${formatNumber(shop._count.products)} (${formatNumber(activeProducts)} ${s.activeProducts})`],
              [s.customers, formatNumber(shop._count.customers)],
              [s.conversations, formatNumber(shop._count.conversations)],
              [s.messages, formatNumber(shop._count.messages)],
              [s.orders, formatNumber(shop._count.orders)],
              [s.gmv, formatUzs(gmv._sum.total ?? 0, locale)],
              [s.aiReplies, `${formatNumber(usage?.aiReplies ?? 0)} / ${formatNumber(ent.monthlyReplies)}`],
              [a.overview.aiCostMonth, formatUsd(aiMonth._sum.costMicroUsd ?? 0)],
              [s.aiCostTotal, formatUsd(aiTotal._sum.costMicroUsd ?? 0)],
              [s.toolErrors, formatNumber(toolErrors)],
            ]}
          />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-3">
        <Card className="xl:col-span-2">
          <CardHeader title={s.messagesChart} />
          <TrendChart data={messagesSeries} />
        </Card>
        <Card>
          <CardHeader title={`${s.channels} (${shop.channels.length})`} />
          {shop.channels.length === 0 ? (
            <Empty>{a.common.empty}</Empty>
          ) : (
            <ul className="divide-y divide-[var(--glass-border)]">
              {shop.channels.map((c) => (
                <li key={c.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-fg">
                      {a.channelType[c.type]} · {c.username ? `@${c.username}` : (c.displayName ?? c.externalId)}
                    </span>
                    <Badge tone={c.status === "ACTIVE" ? "success" : c.status === "ERROR" ? "danger" : "neutral"}>
                      {a.channelStatus[c.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-subtle">
                    {a.channels.conversations}: {c._count.conversations} · {a.channels.businessConnections}: {c._count.businessConnections}
                    {c.tokenExpiresAt && ` · ${a.channels.tokenExpires}: ${formatDate(c.tokenExpiresAt, locale)}`}
                  </p>
                  {c.lastError && <p className="mt-1 text-xs break-words text-danger">{c.lastError}</p>}
                </li>
              ))}
            </ul>
          )}
          <div className="mt-4 border-t border-line pt-4">
            <p className="mb-2 text-sm font-medium text-fg">{s.paymentProviders}</p>
            <Facts
              items={[
                ["Payme", shop.paymentConfig?.paymeEnabled ? `${a.common.yes}${shop.paymentConfig.paymeTestMode ? " (test)" : ""}` : a.common.no],
                ["Click", shop.paymentConfig?.clickEnabled ? a.common.yes : a.common.no],
              ]}
            />
          </div>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title={`${s.invoices} (${shop.invoices.length})`} />
        {shop.invoices.length === 0 ? (
          <Empty>{a.common.empty}</Empty>
        ) : (
          <DataTable columns={[a.common.created, a.common.plan, a.common.amount, a.common.status, a.payments.provider, a.payments.paidAt, ""]}>
            {shop.invoices.map((inv) => (
              <tr key={inv.id}>
                <td className={`${TD} whitespace-nowrap text-muted`}>{formatDateTime(inv.createdAt, locale)}</td>
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
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={s.recentOrders} />
          {orders.length === 0 ? (
            <Empty>{a.common.empty}</Empty>
          ) : (
            <DataTable minWidth={560} columns={[a.orders.number, a.common.customer, a.common.amount, a.common.status, a.common.date]}>
              {orders.map((o) => (
                <tr key={o.id}>
                  <td className={`${TD} font-mono`}>#{o.number}</td>
                  <td className={TD}>
                    <p className="text-fg">{o.customerName}</p>
                    <p className="text-xs text-subtle">{o.phone}</p>
                  </td>
                  <td className={`${TD} font-mono whitespace-nowrap`}>{formatUzs(o.total, locale)}</td>
                  <td className={TD}>
                    <OrderStatusBadge status={o.status} label={t.status[o.status]} />
                  </td>
                  <td className={`${TD} whitespace-nowrap text-muted`}>{formatDateTime(o.createdAt, locale)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>

        <Card>
          <CardHeader title={s.recentConversations} />
          {conversations.length === 0 ? (
            <Empty>{a.common.empty}</Empty>
          ) : (
            <ul className="divide-y divide-[var(--glass-border)]">
              {conversations.map((c) => (
                <li key={c.id} className="py-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/admin/conversations/${c.id}`} className="font-medium text-fg hover:underline">
                      {c.customer.name || (c.customer.username ? `@${c.customer.username}` : "—")}
                    </Link>
                    <span className="text-xs whitespace-nowrap text-subtle">{formatDateTime(c.lastMessageAt, locale)}</span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-subtle">
                    {a.source[c.channel]} · {c.messageCount} · {c.lastMessagePreview}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={s.aiSettings} />
          <Facts
            items={[
              [s.aiEnabled, shop.aiEnabled ? a.common.yes : a.common.no],
              [s.onboarding, shop.onboardingCompleted ? s.completed : `${s.step} ${shop.onboardingStep}`],
              [s.tone, text(shop.toneOfVoice)],
              [s.greeting, text(shop.greeting)],
              [s.workingHours, text(shop.workingHours)],
              [s.pickupAddress, text(shop.pickupAddress)],
              [s.returnPolicy, text(shop.returnPolicy)],
              [s.extraInstructions, text(shop.extraInstructions)],
            ]}
          />
        </Card>

        <Card>
          <CardHeader title={s.latestProducts} />
          {products.length === 0 ? (
            <Empty>{a.common.empty}</Empty>
          ) : (
            <DataTable minWidth={480} columns={[s.productName, s.price, s.stock, s.activeCol]}>
              {products.map((p) => (
                <tr key={p.id}>
                  <td className={TD}>
                    <p className="text-fg">{p.name}</p>
                    {p.category && <p className="text-xs text-subtle">{p.category}</p>}
                  </td>
                  <td className={`${TD} font-mono whitespace-nowrap`}>{formatUzs(p.price, locale)}</td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(p.stock)}</td>
                  <td className={TD}>
                    <Badge tone={p.active ? "success" : "neutral"}>{p.active ? a.common.yes : a.common.no}</Badge>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>
    </>
  );
}
