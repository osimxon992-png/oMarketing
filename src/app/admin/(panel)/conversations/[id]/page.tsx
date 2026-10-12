import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { Empty, Facts } from "@/components/admin/ui";
import { OrderStatusBadge } from "@/components/dashboard/status-badge";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/card";
import { adminContext } from "@/lib/admin/context";
import { db } from "@/lib/db";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatUzs } from "@/lib/utils/format";

export const metadata = { title: "Conversation" };

const MESSAGE_LIMIT = 300;

export default async function AdminConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { a, t, locale } = await adminContext();
  const c = a.conversations;
  const { id } = await params;

  const conv = await db.conversation.findUnique({
    where: { id },
    include: {
      shop: { select: { id: true, name: true } },
      customer: true,
      orders: { orderBy: { createdAt: "desc" } },
      toolCalls: { orderBy: { createdAt: "desc" }, take: 50 },
    },
  });
  if (!conv) notFound();

  // Newest N, shown oldest-first.
  const messages = (
    await db.message.findMany({ where: { conversationId: id }, orderBy: { createdAt: "desc" }, take: MESSAGE_LIMIT })
  ).reverse();
  const customerName = conv.customer.name || (conv.customer.username ? `@${conv.customer.username}` : "—");

  return (
    <>
      <Link href="/admin/conversations" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-3.5 w-3.5" /> {c.back}
      </Link>
      <PageHeader
        title={
          <span className="flex flex-wrap items-center gap-3">
            {customerName}
            <Badge>{a.source[conv.channel]}</Badge>
            {conv.aiPaused && <Badge tone="warning">{c.aiPaused}</Badge>}
          </span>
        }
        description={
          <>
            <Link href={`/admin/shops/${conv.shop.id}`} className="hover:underline">
              {conv.shop.name}
            </Link>{" "}
            · {a.common.created}: {formatDateTime(conv.createdAt, locale)}
          </>
        }
      />

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <CardHeader title={`${c.messages} (${conv.messageCount})`} description={conv.messageCount > MESSAGE_LIMIT ? c.olderHidden : undefined} />
          {messages.length === 0 ? (
            <Empty>{a.common.empty}</Empty>
          ) : (
            <ol className="space-y-3">
              {messages.map((m) => {
                const mine = m.role === "AI" || m.role === "SELLER";
                return (
                  <li key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start", m.role === "SYSTEM" && "items-center")}>
                    <div
                      className={cn(
                        "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap break-words",
                        m.role === "CUSTOMER" && "rounded-bl-md border border-line bg-glass-strong text-fg",
                        m.role === "AI" && "rounded-br-md bg-fg text-page",
                        m.role === "SELLER" && "rounded-br-md border border-fg/30 bg-fg/10 text-fg",
                        m.role === "SYSTEM" && "border border-dashed border-line text-xs text-muted",
                      )}
                    >
                      {m.text || "—"}
                    </div>
                    <span className="mt-1 text-[11px] text-subtle">
                      {a.role[m.role]} · {formatDateTime(m.createdAt, locale)}
                    </span>
                  </li>
                );
              })}
            </ol>
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={a.common.customer} />
            <Facts
              items={[
                [a.users.name, conv.customer.name || "—"],
                [c.username, conv.customer.username ? `@${conv.customer.username}` : null],
                [a.common.phone, conv.customer.phone],
                [c.address, conv.customer.address],
                [c.tags, conv.tags.length ? conv.tags.join(", ") : null],
                [c.unread, String(conv.unread)],
              ]}
            />
            {conv.summary && (
              <div className="mt-4 border-t border-line pt-4">
                <p className="mb-1 text-sm font-medium text-fg">{c.summary}</p>
                <p className="text-sm whitespace-pre-wrap text-muted">{conv.summary}</p>
              </div>
            )}
          </Card>

          <Card>
            <CardHeader title={`${c.linkedOrders} (${conv.orders.length})`} />
            {conv.orders.length === 0 ? (
              <Empty>{a.common.empty}</Empty>
            ) : (
              <ul className="divide-y divide-[var(--glass-border)]">
                {conv.orders.map((o) => (
                  <li key={o.id} className="flex items-center justify-between gap-2 py-2.5 text-sm">
                    <span className="font-mono">#{o.number}</span>
                    <span className="font-mono">{formatUzs(o.total, locale)}</span>
                    <OrderStatusBadge status={o.status} label={t.status[o.status]} />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card>
            <CardHeader title={`${c.toolCalls} (${conv.toolCalls.length})`} />
            {conv.toolCalls.length === 0 ? (
              <Empty>{a.common.empty}</Empty>
            ) : (
              <ul className="divide-y divide-[var(--glass-border)]">
                {conv.toolCalls.map((tc) => (
                  <li key={tc.id} className="py-2.5 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-fg">{tc.name}</span>
                      <span className="text-xs text-subtle">{tc.durationMs} ms</span>
                    </div>
                    <p className="text-xs text-subtle">
                      {formatDateTime(tc.createdAt, locale)}
                      {tc.isError && <span className="ml-2 text-danger">{c.error}</span>}
                    </p>
                    {tc.isError && (
                      <pre className="mt-1 max-h-32 overflow-auto rounded-lg bg-glass-strong p-2 text-[11px] whitespace-pre-wrap text-muted">
                        {JSON.stringify(tc.output, null, 2)}
                      </pre>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
