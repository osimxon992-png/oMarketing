import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { OrderStatusBadge } from "@/components/dashboard/status-badge";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { requireShop } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n/server";
import { pagesDictionaries } from "@/lib/i18n/pages";
import { formatDateTime, formatUzs } from "@/lib/utils/format";
import { StatusControl } from "./status-control";

export const metadata = { title: "Buyurtma" };

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { shop } = await requireShop();
  const { t, locale } = await getDict();
  const p = pagesDictionaries[locale].orders;
  const { id } = await params;
  const order = await db.order.findFirst({ where: { id, shopId: shop.id }, include: { items: true } });
  if (!order) notFound();

  const row = (label: string, value: React.ReactNode) => (
    <div className="flex justify-between gap-4 py-2 text-sm">
      <span className="text-muted">{label}</span>
      <span className="text-right font-medium text-fg">{value}</span>
    </div>
  );

  return (
    <>
      <Link href="/dashboard/orders" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-fg">
        <ArrowLeft className="h-4 w-4" /> {p.back}
      </Link>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">#{order.number}</h1>
        <OrderStatusBadge status={order.status} label={t.status[order.status]} />
        {(order.source === "PLAYGROUND" || order.source === "DEMO") && <Badge>{p.test}</Badge>}
        <span className="text-sm text-subtle">{formatDateTime(order.createdAt, locale)}</span>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader title={p.items} />
          <ul className="divide-y divide-[var(--glass-border)]">
            {order.items.map((it) => (
              <li key={it.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                <span className="min-w-0">
                  <span className="block font-medium text-fg">{it.name}</span>
                  <span className="text-xs text-subtle">
                    {it.variantLabel && `${it.variantLabel} · `}
                    {formatUzs(it.unitPrice, locale)} × {it.quantity}
                  </span>
                </span>
                <span className="font-mono font-semibold text-fg">{formatUzs(it.lineTotal, locale)}</span>
              </li>
            ))}
          </ul>
          <div className="mt-2 border-t border-line pt-2">
            {row(p.subtotal, formatUzs(order.subtotal, locale))}
            {order.deliveryType === "DELIVERY" && row(p.deliveryPrice, formatUzs(order.deliveryPrice, locale))}
            <div className="flex justify-between gap-4 pt-3 text-base">
              <span className="font-semibold text-fg">{p.total}</span>
              <span className="font-mono text-lg font-bold text-fg">{formatUzs(order.total, locale)}</span>
            </div>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader title={p.changeStatus} />
            <StatusControl orderId={order.id} status={order.status} labels={t.status} saved={p.statusSaved} />
            {order.paidAt && <p className="mt-3 text-xs text-subtle">{p.paidAt}: {formatDateTime(order.paidAt, locale)}{order.paymentProvider ? ` · ${order.paymentProvider}` : ""}</p>}
          </Card>
          <Card>
            <CardHeader title={p.customer} />
            {row(p.customer, order.customerName || "—")}
            {row(p.phone, <a href={`tel:${order.phone}`} className="hover:underline">{order.phone}</a>)}
            {row(p.delivery, order.deliveryType === "PICKUP" ? p.pickup : p.delivery)}
            {order.deliveryZone && row(p.zone, order.deliveryZone)}
            {order.deliveryAddress && row(p.address, order.deliveryAddress)}
            {order.note && row(p.note, order.note)}
            {row(p.source, order.source.toLowerCase().replace("_", " "))}
            {order.conversationId && (
              <Link href={`/dashboard/inbox/${order.conversationId}`} className={buttonClass("secondary", "sm", "mt-3 w-full")}>
                <MessageSquare className="h-4 w-4" /> {p.openChat}
              </Link>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
