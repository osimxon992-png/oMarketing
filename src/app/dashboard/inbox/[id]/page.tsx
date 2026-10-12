import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { OrderStatusBadge } from "@/components/dashboard/status-badge";
import { Card, CardHeader } from "@/components/ui/card";
import { requireShop } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n/server";
import { pagesDictionaries } from "@/lib/i18n/pages";
import { formatUzs } from "@/lib/utils/format";
import { Thread } from "./thread";

export const metadata = { title: "Suhbat" };

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { shop } = await requireShop();
  const { t, locale } = await getDict();
  const p = pagesDictionaries[locale].inbox;
  const { id } = await params;
  const convo = await db.conversation.findFirst({
    where: { id, shopId: shop.id },
    include: {
      customer: true,
      messages: { orderBy: { createdAt: "asc" }, take: 300, select: { id: true, role: true, text: true, createdAt: true } },
      orders: { orderBy: { createdAt: "desc" }, take: 10, select: { id: true, number: true, total: true, status: true } },
    },
  });
  if (!convo) notFound();
  // Opening the conversation marks it read.
  if (convo.unread > 0) await db.conversation.update({ where: { id: convo.id }, data: { unread: 0 } });

  const name = convo.customer.name || (convo.customer.username ? `@${convo.customer.username}` : "—");
  const canReply = convo.channel === "TELEGRAM" || convo.channel === "PLAYGROUND" || convo.channel === "DEMO";

  return (
    <>
      <Link href="/dashboard/inbox" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> {p.back}
      </Link>
      <div className="grid gap-4 lg:grid-cols-[1fr_300px]">
        <Thread
          conversationId={convo.id}
          title={name}
          channel={convo.channel}
          aiPaused={convo.aiPaused}
          canReply={canReply}
          messages={convo.messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() }))}
        />
        <div className="space-y-4">
          <Card>
            <CardHeader title={p.customer} />
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3"><dt className="text-muted">{p.customer}</dt><dd className="text-right font-medium text-fg">{name}</dd></div>
              {convo.customer.username && <div className="flex justify-between gap-3"><dt className="text-muted">Username</dt><dd className="text-fg">@{convo.customer.username}</dd></div>}
              {convo.customer.phone && <div className="flex justify-between gap-3"><dt className="text-muted">{p.phone}</dt><dd className="text-fg">{convo.customer.phone}</dd></div>}
              {convo.customer.address && <div className="flex justify-between gap-3"><dt className="text-muted">{p.address}</dt><dd className="text-right text-fg">{convo.customer.address}</dd></div>}
              <div className="flex justify-between gap-3"><dt className="text-muted">{p.channel}</dt><dd className="text-fg">{convo.channel.toLowerCase()}</dd></div>
            </dl>
          </Card>
          <Card>
            <CardHeader title={p.orders} />
            {convo.orders.length === 0 ? (
              <p className="text-sm text-subtle">{p.noOrders}</p>
            ) : (
              <ul className="space-y-2">
                {convo.orders.map((o) => (
                  <li key={o.id}>
                    <Link href={`/dashboard/orders/${o.id}`} className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 text-sm transition hover:bg-glass-strong">
                      <span className="font-mono text-muted">#{o.number}</span>
                      <span className="font-mono text-fg">{formatUzs(o.total, locale)}</span>
                      <OrderStatusBadge status={o.status} label={t.status[o.status]} />
                    </Link>
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
