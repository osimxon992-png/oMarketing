import Link from "next/link";
import type { ChannelStatus, ChannelType, Prisma } from "@prisma/client";
import { DataTable, Empty, Pills, Stat, StatGrid, TD, withQuery } from "@/components/admin/ui";
import { Badge, Card, PageHeader } from "@/components/ui/card";
import { adminContext } from "@/lib/admin/context";
import { DAY, oneOf } from "@/lib/admin/queries";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils/cn";
import { formatDate, formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Channels" };

const STATUSES = ["ACTIVE", "ERROR", "DISCONNECTED"] as const satisfies readonly ChannelStatus[];
const TYPES = ["TELEGRAM_BOT", "INSTAGRAM"] as const satisfies readonly ChannelType[];
type Search = Promise<{ status?: string; type?: string }>;

export default async function AdminChannelsPage({ searchParams }: { searchParams: Search }) {
  const { a, locale, now } = await adminContext();
  const c = a.channels;
  const sp = await searchParams;
  const status = oneOf(sp.status, STATUSES);
  const type = oneOf(sp.type, TYPES);
  const where: Prisma.ChannelWhereInput = { ...(status ? { status } : {}), ...(type ? { type } : {}) };

  const [byStatus, byType, channels] = await Promise.all([
    db.channel.groupBy({ by: ["status"], _count: true }),
    db.channel.groupBy({ by: ["type"], _count: true }),
    db.channel.findMany({
      where,
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      // shortcut: no paging, first 500 channels only; add a Pager once there are more.
      take: 500,
      include: { shop: { select: { id: true, name: true } }, _count: { select: { conversations: true, businessConnections: true } } },
    }),
  ]);

  const statusCount = (s: ChannelStatus) => byStatus.find((r) => r.status === s)?._count ?? 0;
  const typeCount = (t: ChannelType) => byType.find((r) => r.type === t)?._count ?? 0;
  const total = byStatus.reduce((n, r) => n + r._count, 0);
  const href = (p: { status?: string; type?: string }) => withQuery("/admin/channels", p);

  return (
    <>
      <PageHeader title={a.nav.channels} description={c.subtitle} />

      <StatGrid className="xl:grid-cols-5">
        <Stat label={a.common.total} value={formatNumber(total)} href={href({})} />
        {STATUSES.map((s) => (
          <Stat key={s} label={a.channelStatus[s]} value={formatNumber(statusCount(s))} href={href({ status: s })} />
        ))}
        <Stat label={a.channelType.INSTAGRAM} value={formatNumber(typeCount("INSTAGRAM"))} href={href({ type: "INSTAGRAM" })} />
      </StatGrid>

      <Card className="mt-4">
        <div className="mb-4 flex flex-wrap gap-3">
          <Pills
            items={[
              { label: a.common.all, href: href({ type }), active: !status, count: total },
              ...STATUSES.map((s) => ({ label: a.channelStatus[s], href: href({ status: s, type }), active: status === s, count: statusCount(s) })),
            ]}
          />
          <Pills
            items={[
              { label: a.common.all, href: href({ status }), active: !type },
              ...TYPES.map((t) => ({ label: a.channelType[t], href: href({ status, type: t }), active: type === t, count: typeCount(t) })),
            ]}
          />
        </div>
        {channels.length === 0 ? (
          <Empty>{a.common.empty}</Empty>
        ) : (
          <DataTable
            minWidth={1100}
            columns={[a.common.shop, c.type, c.account, a.common.status, c.conversations, c.businessConnections, c.tokenExpires, c.lastError, a.common.created]}
          >
            {channels.map((ch) => {
              const expiresSoon = ch.tokenExpiresAt && ch.tokenExpiresAt.getTime() - now.getTime() < 7 * DAY;
              return (
                <tr key={ch.id}>
                  <td className={TD}>
                    <Link href={`/admin/shops/${ch.shop.id}`} className="font-medium text-fg hover:underline">
                      {ch.shop.name}
                    </Link>
                  </td>
                  <td className={`${TD} whitespace-nowrap text-muted`}>{a.channelType[ch.type]}</td>
                  <td className={TD}>
                    <p className="text-fg">{ch.username ? `@${ch.username}` : (ch.displayName ?? "—")}</p>
                    <p className="font-mono text-xs text-subtle">{ch.externalId}</p>
                  </td>
                  <td className={TD}>
                    <Badge tone={ch.status === "ACTIVE" ? "success" : ch.status === "ERROR" ? "danger" : "neutral"}>{a.channelStatus[ch.status]}</Badge>
                  </td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(ch._count.conversations)}</td>
                  <td className={`${TD} tabular-nums`}>{formatNumber(ch._count.businessConnections)}</td>
                  <td className={cn(TD, "whitespace-nowrap", expiresSoon ? "text-warning" : "text-muted")}>
                    {ch.tokenExpiresAt ? formatDate(ch.tokenExpiresAt, locale) : "—"}
                  </td>
                  <td className={TD}>
                    {ch.lastError ? <p className="max-w-[22rem] text-xs break-words text-danger">{ch.lastError}</p> : <span className="text-subtle">—</span>}
                  </td>
                  <td className={`${TD} whitespace-nowrap text-muted`}>{formatDate(ch.createdAt, locale)}</td>
                </tr>
              );
            })}
          </DataTable>
        )}
      </Card>
    </>
  );
}
