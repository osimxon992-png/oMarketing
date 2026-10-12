import Link from "next/link";
import { TrendChart } from "@/components/admin/trend-chart";
import { DataTable, Empty, Stat, StatGrid, TD } from "@/components/admin/ui";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { adminContext } from "@/lib/admin/context";
import { DAY, timeSeries } from "@/lib/admin/queries";
import { db } from "@/lib/db";
import { formatDateTime, formatNumber, formatUsd } from "@/lib/utils/format";

export const metadata = { title: "AI" };

export default async function AdminAiPage() {
  const { a, locale, now, monthStart } = await adminContext();
  const x = a.ai;
  const monthAgo = new Date(now.getTime() - 30 * DAY);

  const [month, last30, allTime, toolCalls30, toolErrors30, byModel, byShop, errors, series] = await Promise.all([
    db.aiUsage.aggregate({
      where: { createdAt: { gte: monthStart } },
      _sum: { costMicroUsd: true, inputTokens: true, outputTokens: true, cacheReadTokens: true, cacheCreationTokens: true },
      _count: true,
    }),
    db.aiUsage.aggregate({ where: { createdAt: { gte: monthAgo } }, _sum: { costMicroUsd: true } }),
    db.aiUsage.aggregate({ _sum: { costMicroUsd: true }, _count: true }),
    db.aiToolCall.count({ where: { createdAt: { gte: monthAgo } } }),
    db.aiToolCall.count({ where: { createdAt: { gte: monthAgo }, isError: true } }),
    db.aiUsage.groupBy({
      by: ["model"],
      where: { createdAt: { gte: monthStart } },
      _sum: { costMicroUsd: true, inputTokens: true, outputTokens: true, cacheReadTokens: true },
      _count: true,
      orderBy: { _sum: { costMicroUsd: "desc" } },
    }),
    db.aiUsage.groupBy({
      by: ["shopId"],
      where: { createdAt: { gte: monthStart } },
      _sum: { costMicroUsd: true, outputTokens: true },
      _count: true,
      orderBy: { _sum: { costMicroUsd: "desc" } },
      take: 10,
    }),
    db.aiToolCall.findMany({
      where: { isError: true },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: { shop: { select: { id: true, name: true } } },
    }),
    timeSeries("aiCost", "day", 30),
  ]);

  const shopNames = new Map(
    (await db.shop.findMany({ where: { id: { in: byShop.map((r) => r.shopId) } }, select: { id: true, name: true } })).map((s) => [s.id, s.name]),
  );
  const m = month._sum;
  // Anthropic usage: input_tokens excludes cached tokens, so the cache share is read / (input + read + write).
  const promptTokens = (m.inputTokens ?? 0) + (m.cacheReadTokens ?? 0) + (m.cacheCreationTokens ?? 0);
  const cacheShare = promptTokens ? Math.round(((m.cacheReadTokens ?? 0) / promptTokens) * 100) : 0;

  return (
    <>
      <PageHeader title={a.nav.ai} description={x.subtitle} />

      <StatGrid>
        <Stat label={x.costMonth} value={formatUsd(m.costMicroUsd ?? 0)} hint={`${x.requests}: ${formatNumber(month._count)}`} />
        <Stat label={x.cost30} value={formatUsd(last30._sum.costMicroUsd ?? 0)} />
        <Stat label={x.costTotal} value={formatUsd(allTime._sum.costMicroUsd ?? 0)} hint={`${x.requests}: ${formatNumber(allTime._count)}`} />
        <Stat label={x.cacheShare} value={`${cacheShare}%`} />
        <Stat label={x.tokensIn} value={formatNumber(promptTokens)} />
        <Stat label={x.tokensOut} value={formatNumber(m.outputTokens ?? 0)} />
        <Stat label={x.toolCalls30} value={formatNumber(toolCalls30)} />
        <Stat label={x.toolErrors30} value={formatNumber(toolErrors30)} />
      </StatGrid>

      <Card className="mt-4">
        <CardHeader title={x.chart} />
        <TrendChart data={series} format="usd" />
      </Card>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title={x.byModel} />
          {byModel.length === 0 ? (
            <Empty>{a.common.empty}</Empty>
          ) : (
            <DataTable minWidth={560} columns={[x.model, x.requests, x.tokensIn, x.tokensOut, x.cost]}>
              {byModel.map((r) => (
                <tr key={r.model}>
                  <td className={`${TD} font-mono text-fg`}>{r.model}</td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(r._count)}</td>
                  <td className={`${TD} tabular-nums`}>{formatNumber((r._sum.inputTokens ?? 0) + (r._sum.cacheReadTokens ?? 0))}</td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(r._sum.outputTokens ?? 0)}</td>
                  <td className={`${TD} font-mono`}>{formatUsd(r._sum.costMicroUsd ?? 0)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>

        <Card>
          <CardHeader title={x.topShops} />
          {byShop.length === 0 ? (
            <Empty>{a.common.empty}</Empty>
          ) : (
            <DataTable minWidth={480} columns={[a.common.shop, x.requests, x.tokensOut, x.cost]}>
              {byShop.map((r) => (
                <tr key={r.shopId}>
                  <td className={TD}>
                    <Link href={`/admin/shops/${r.shopId}`} className="font-medium text-fg hover:underline">
                      {shopNames.get(r.shopId) ?? r.shopId}
                    </Link>
                  </td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(r._count)}</td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(r._sum.outputTokens ?? 0)}</td>
                  <td className={`${TD} font-mono`}>{formatUsd(r._sum.costMicroUsd ?? 0)}</td>
                </tr>
              ))}
            </DataTable>
          )}
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title={x.recentErrors} />
        {errors.length === 0 ? (
          <Empty>{a.common.empty}</Empty>
        ) : (
          <DataTable columns={[a.common.date, a.common.shop, x.tool, "Output", ""]}>
            {errors.map((e) => (
              <tr key={e.id}>
                <td className={`${TD} whitespace-nowrap text-muted`}>{formatDateTime(e.createdAt, locale)}</td>
                <td className={TD}>
                  <Link href={`/admin/shops/${e.shop.id}`} className="text-fg hover:underline">
                    {e.shop.name}
                  </Link>
                </td>
                <td className={`${TD} font-mono text-fg`}>{e.name}</td>
                <td className={TD}>
                  <p className="max-w-[36rem] truncate font-mono text-xs text-muted">{JSON.stringify(e.output)}</p>
                </td>
                <td className={`${TD} text-right`}>
                  {e.conversationId && (
                    <Link href={`/admin/conversations/${e.conversationId}`} className="text-xs font-medium text-muted hover:text-fg">
                      {a.common.open} →
                    </Link>
                  )}
                </td>
              </tr>
            ))}
          </DataTable>
        )}
      </Card>
    </>
  );
}
