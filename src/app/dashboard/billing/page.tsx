import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/card";
import { requireShop } from "@/lib/auth/session";
import { invoicePaymentLinks } from "@/lib/billing";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n/server";
import { pagesDictionaries } from "@/lib/i18n/pages";
import { ensurePlans, getEntitlements, getMonthlyUsage } from "@/lib/shop";
import { formatDate, formatNumber, formatUzs } from "@/lib/utils/format";
import { PlanPicker } from "./plan-picker";

export const metadata = { title: "Tarif" };

export default async function BillingPage() {
  const { shop } = await requireShop();
  const { locale } = await getDict();
  const p = pagesDictionaries[locale].billing;
  await ensurePlans();
  const [ent, usage, plans, invoices] = await Promise.all([
    getEntitlements(shop),
    getMonthlyUsage(shop.id),
    db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    db.billingInvoice.findMany({ where: { shopId: shop.id }, orderBy: { createdAt: "desc" }, take: 20, include: { plan: { select: { name: true } } } }),
  ]);
  const statusLabel = { TRIALING: p.trial, ACTIVE: p.active, EXPIRED: p.expired }[ent.status];
  const pct = ent.monthlyReplies ? Math.min(100, Math.round((usage / ent.monthlyReplies) * 100)) : 100;

  return (
    <>
      <PageHeader title={p.title} description={p.subtitle} />
      <Card className="mb-4">
        <CardHeader title={p.current} />
        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-muted">{p.currentPlan}</p>
            <p className="mt-1 flex items-center gap-2 text-xl font-semibold text-fg">
              {ent.planName} <Badge tone={ent.status === "EXPIRED" ? "danger" : ent.status === "ACTIVE" ? "success" : "accent"}>{statusLabel}</Badge>
            </p>
          </div>
          <div>
            <p className="text-sm text-muted">{p.until}</p>
            <p className="mt-1 text-xl font-semibold text-fg">{formatDate(ent.endsAt, locale)}</p>
          </div>
          <div>
            <p className="text-sm text-muted">{p.usage}</p>
            <p className="mt-1 text-xl font-semibold text-fg">
              {formatNumber(usage)} <span className="text-base text-subtle">/ {formatNumber(ent.monthlyReplies)}</span>
            </p>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-glass-strong">
              <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </Card>

      <PlanPicker
        plans={plans.map((pl) => ({ code: pl.code, name: pl.name, priceUzs: pl.priceUzs, monthlyReplies: pl.monthlyReplies, instagram: pl.instagram, webWidget: pl.webWidget }))}
        currentCode={ent.status === "ACTIVE" ? ent.planCode : null}
      />

      <Card className="mt-4">
        <CardHeader title={p.invoices} />
        {invoices.length === 0 ? (
          <p className="text-sm text-subtle">{p.noInvoices}</p>
        ) : (
          <ul className="divide-y divide-[var(--glass-border)]">
            {invoices.map((inv) => {
              const links = inv.status === "PENDING" ? invoicePaymentLinks(inv, { shopName: shop.name, planName: inv.plan.name }) : [];
              return (
                <li key={inv.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                  <span className="text-subtle">{formatDate(inv.createdAt, locale)}</span>
                  <span className="flex-1 font-medium text-fg">
                    {inv.plan.name} · {inv.months} {p.months}
                  </span>
                  <span className="font-mono text-fg">{formatUzs(inv.amount, locale)}</span>
                  <Badge tone={inv.status === "PAID" ? "success" : inv.status === "CANCELLED" ? "danger" : "warning"}>
                    {inv.status === "PAID" ? p.paid : inv.status === "CANCELLED" ? p.cancelled : p.pending}
                  </Badge>
                  {links.map((l) => (
                    <a key={l.provider} href={l.url} target="_blank" rel="noreferrer" className="rounded-full bg-fg px-3 py-1 text-xs font-semibold text-page">
                      {l.provider === "telegram" ? p.payTelegram : `${l.provider === "payme" ? "Payme" : "Click"} · ${p.pay}`}
                    </a>
                  ))}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </>
  );
}
