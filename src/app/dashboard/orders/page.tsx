import Link from "next/link";
import type { OrderStatus, Prisma } from "@prisma/client";
import { Search, ShoppingBag } from "lucide-react";
import { OrderStatusBadge } from "@/components/dashboard/status-badge";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui/card";
import { requireShop } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n/server";
import { pagesDictionaries } from "@/lib/i18n/pages";
import { cn } from "@/lib/utils/cn";
import { formatDateTime, formatUzs } from "@/lib/utils/format";

export const metadata = { title: "Buyurtmalar" };

const STATUSES: OrderStatus[] = ["NEW", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"];
const PAGE_SIZE = 30;

export default async function OrdersPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string; page?: string }> }) {
  const { shop } = await requireShop();
  const { t, locale } = await getDict();
  const p = pagesDictionaries[locale].orders;
  const sp = await searchParams;
  const status = STATUSES.find((s) => s === sp.status);
  const page = Math.max(1, Number(sp.page) || 1);
  const q = sp.q?.trim();

  const where: Prisma.OrderWhereInput = { shopId: shop.id };
  if (status) where.status = status;
  if (q) {
    const num = Number(q.replace(/^#/, ""));
    where.OR = [
      { customerName: { contains: q, mode: "insensitive" } },
      { phone: { contains: q.replace(/\D/g, "") || q } },
      ...(Number.isInteger(num) && num > 0 ? [{ number: num }] : []),
    ];
  }
  const [orders, total, counts] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * PAGE_SIZE, take: PAGE_SIZE, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
    db.order.groupBy({ by: ["status"], where: { shopId: shop.id }, _count: { _all: true } }),
  ]);
  const countOf = (s?: OrderStatus) => (s ? counts.find((c) => c.status === s)?._count._all ?? 0 : counts.reduce((a, c) => a + c._count._all, 0));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const link = (next: { status?: string; page?: number }) => {
    const u = new URLSearchParams();
    const st = "status" in next ? next.status : status;
    if (st) u.set("status", st);
    if (q) u.set("q", q);
    if (next.page && next.page > 1) u.set("page", String(next.page));
    const s = u.toString();
    return s ? `?${s}` : "?";
  };

  return (
    <>
      <PageHeader title={p.title} description={p.subtitle} />

      <div className="mb-4 flex flex-wrap gap-2">
        {[undefined, ...STATUSES].map((s) => (
          <Link
            key={s ?? "all"}
            href={link({ status: s })}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm transition",
              status === s ? "border-accent bg-accent text-accent-fg" : "border-line text-muted hover:bg-glass-strong hover:text-fg",
            )}
          >
            {s ? t.status[s] : p.all}
            <span className="text-xs opacity-70">{countOf(s)}</span>
          </Link>
        ))}
      </div>

      <Card className="mb-4 p-3">
        <form className="flex gap-2" role="search">
          {status && <input type="hidden" name="status" value={status} />}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input name="q" defaultValue={q} placeholder={p.search} className="field pl-9" aria-label={t.common.search} />
          </div>
          <button className={buttonClass("secondary")}>{t.common.search}</button>
        </form>
      </Card>

      {orders.length === 0 ? (
        <Card>
          <EmptyState
            icon={<ShoppingBag className="h-7 w-7" />}
            title={q || status ? t.common.noResults : p.empty}
            description={q || status ? undefined : p.emptyText}
            action={
              !q && !status && (
                <Link href="/dashboard/playground" className={buttonClass("primary")}>
                  {t.nav.testChat}
                </Link>
              )
            }
          />
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y divide-[var(--glass-border)]">
            {orders.map((o) => (
              <li key={o.id}>
                <Link href={`/dashboard/orders/${o.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3.5 transition hover:bg-glass sm:px-5">
                  <span className="w-16 font-mono text-sm text-muted">#{o.number}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-fg">{o.customerName || "—"}</span>
                    <span className="block text-xs text-subtle">
                      {o.phone} · {formatDateTime(o.createdAt, locale)} · {o._count.items} {p.items.toLowerCase()}
                    </span>
                  </span>
                  {(o.source === "PLAYGROUND" || o.source === "DEMO") && <Badge>{p.test}</Badge>}
                  <span className="font-mono text-sm font-semibold text-fg">{formatUzs(o.total, locale)}</span>
                  <OrderStatusBadge status={o.status} label={t.status[o.status]} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pages > 1 && (
        <nav className="mt-4 flex items-center justify-center gap-2" aria-label={t.common.page}>
          {page > 1 && (
            <Link href={link({ page: page - 1 })} className={buttonClass("secondary", "sm")}>
              {t.common.prev}
            </Link>
          )}
          <span className="text-sm text-muted">
            {page} / {pages}
          </span>
          {page < pages && (
            <Link href={link({ page: page + 1 })} className={buttonClass("secondary", "sm")}>
              {t.common.next}
            </Link>
          )}
        </nav>
      )}
    </>
  );
}
