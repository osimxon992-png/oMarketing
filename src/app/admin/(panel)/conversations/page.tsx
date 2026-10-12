import Link from "next/link";
import type { ConversationChannel, Prisma } from "@prisma/client";
import { TrendChart } from "@/components/admin/trend-chart";
import { DataTable, Empty, Pager, Pills, SearchBox, Stat, StatGrid, TD, withQuery } from "@/components/admin/ui";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/card";
import { adminContext } from "@/lib/admin/context";
import { DAY, oneOf, PAGE_SIZE, pageParam, searchParam, timeSeries } from "@/lib/admin/queries";
import { db } from "@/lib/db";
import { formatDateTime, formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Conversations" };

const CHANNELS = ["TELEGRAM", "TELEGRAM_BUSINESS", "INSTAGRAM", "WEB_WIDGET", "PLAYGROUND", "DEMO"] as const satisfies readonly ConversationChannel[];
type Search = Promise<{ channel?: string; q?: string; page?: string }>;

export default async function AdminConversationsPage({ searchParams }: { searchParams: Search }) {
  const { a, locale, now } = await adminContext();
  const c = a.conversations;
  const sp = await searchParams;
  const channel = oneOf(sp.channel, CHANNELS);
  const q = searchParam(sp.q);
  const page = pageParam(sp.page);

  const where: Prisma.ConversationWhereInput = {
    ...(channel ? { channel } : {}),
    ...(q
      ? {
          OR: [
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { username: { contains: q.replace(/^@/, ""), mode: "insensitive" } } },
            { lastMessagePreview: { contains: q, mode: "insensitive" } },
            { shop: { name: { contains: q, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [total, byChannel, messages24h, paused, unread, conversations, series] = await Promise.all([
    db.conversation.count({ where }),
    db.conversation.groupBy({ by: ["channel"], _count: true }),
    db.message.count({ where: { createdAt: { gte: new Date(now.getTime() - DAY) } } }),
    db.conversation.count({ where: { aiPaused: true } }),
    db.conversation.aggregate({ _sum: { unread: true } }),
    db.conversation.findMany({
      where,
      orderBy: { lastMessageAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { shop: { select: { id: true, name: true } }, customer: { select: { name: true, username: true, phone: true } } },
    }),
    timeSeries("messages", "day", 30),
  ]);

  const countOf = (ch: ConversationChannel) => byChannel.find((r) => r.channel === ch)?._count ?? 0;
  const allCount = byChannel.reduce((n, r) => n + r._count, 0);
  const href = (p: { channel?: string; page?: number }) =>
    withQuery("/admin/conversations", { channel: p.channel, q, page: p.page && p.page > 1 ? p.page : undefined });

  return (
    <>
      <PageHeader title={a.nav.conversations} description={c.subtitle} />

      <StatGrid>
        <Stat label={a.common.total} value={formatNumber(allCount)} />
        <Stat label={c.messages24h} value={formatNumber(messages24h)} />
        <Stat label={c.unread} value={formatNumber(unread._sum.unread ?? 0)} />
        <Stat label={c.aiPaused} value={formatNumber(paused)} />
      </StatGrid>

      <Card className="mt-4">
        <CardHeader title={c.chart} />
        <TrendChart data={series} />
      </Card>

      <Card className="mt-4">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Pills
            items={[
              { label: a.common.all, href: href({}), active: !channel, count: allCount },
              ...CHANNELS.map((ch) => ({ label: a.source[ch], href: href({ channel: ch }), active: channel === ch, count: countOf(ch) })),
            ]}
          />
          <SearchBox q={q} placeholder={c.searchPlaceholder} button={a.common.search} keep={{ channel }} />
        </div>
        {conversations.length === 0 ? (
          <Empty>{a.common.empty}</Empty>
        ) : (
          <DataTable minWidth={1100} columns={[a.common.customer, a.common.shop, c.channel, c.messages, c.lastMessage, ""]}>
            {conversations.map((conv) => (
              <tr key={conv.id}>
                <td className={TD}>
                  <Link href={`/admin/conversations/${conv.id}`} className="font-medium text-fg hover:underline">
                    {conv.customer.name || (conv.customer.username ? `@${conv.customer.username}` : "—")}
                  </Link>
                  <p className="text-xs text-subtle">
                    {[conv.customer.username && `@${conv.customer.username}`, conv.customer.phone].filter(Boolean).join(" · ")}
                  </p>
                </td>
                <td className={TD}>
                  <Link href={`/admin/shops/${conv.shop.id}`} className="text-fg hover:underline">
                    {conv.shop.name}
                  </Link>
                </td>
                <td className={`${TD} whitespace-nowrap text-muted`}>{a.source[conv.channel]}</td>
                <td className={`${TD} tabular-nums`}>
                  {formatNumber(conv.messageCount)}
                  {conv.unread > 0 && <span className="ml-2 rounded-full bg-fg px-2 py-0.5 text-[11px] font-bold text-page">{conv.unread}</span>}
                </td>
                <td className={TD}>
                  <p className="max-w-[28rem] truncate text-fg">{conv.lastMessagePreview || "—"}</p>
                  <p className="text-xs text-subtle">{formatDateTime(conv.lastMessageAt, locale)}</p>
                </td>
                <td className={`${TD} text-right`}>{conv.aiPaused && <Badge tone="warning">{c.aiPaused}</Badge>}</td>
              </tr>
            ))}
          </DataTable>
        )}
        <Pager page={page} total={total} pageSize={PAGE_SIZE} labels={a.common} href={(p) => href({ channel, page: p })} />
      </Card>
    </>
  );
}
