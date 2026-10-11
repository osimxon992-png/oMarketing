import Link from "next/link";
import { Check, CircleDashed } from "lucide-react";
import { Card, CardHeader, PageHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { requireShop } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/server";
import { getSetupStatus } from "@/lib/onboarding";
import { getEntitlements, getMonthlyUsage } from "@/lib/shop";
import { formatNumber } from "@/lib/utils/format";

export const metadata = { title: "Boshqaruv" };

export default async function DashboardPage() {
  const { user, shop } = await requireShop();
  const { t } = await getDict();
  const [status, ent, usage] = await Promise.all([getSetupStatus(shop.id), getEntitlements(shop), getMonthlyUsage(shop.id)]);

  const checklist = [
    { done: status.products, label: t.onboarding.productsTitle, href: "/dashboard/products" },
    { done: status.channel, label: t.onboarding.channelTitle, href: "/dashboard/channels" },
    { done: status.payment, label: t.onboarding.paymentTitle, href: "/dashboard/payments" },
    { done: status.tested, label: t.onboarding.testTitle, href: "/dashboard/playground" },
  ];
  const pct = ent.monthlyReplies > 0 ? Math.min(100, Math.round((usage / ent.monthlyReplies) * 100)) : 100;

  return (
    <>
      <PageHeader title={`${t.dashboard.welcome}, ${user.name.split(" ")[0]}!`} description={shop.name} />
      <div className="grid gap-4 lg:grid-cols-3">
        {checklist.some((c) => !c.done) && (
          <Card className="lg:col-span-2">
            <CardHeader title={t.dashboard.setupChecklist} />
            <ul className="space-y-2">
              {checklist.map((c) => (
                <li key={c.href} className="flex items-center gap-3 rounded-2xl bg-glass px-3 py-2.5">
                  {c.done ? <Check className="h-5 w-5 text-success" /> : <CircleDashed className="h-5 w-5 text-subtle" />}
                  <span className={c.done ? "flex-1 text-muted line-through" : "flex-1 text-fg"}>{c.label}</span>
                  {!c.done && (
                    <Link href={c.href} className={buttonClass("secondary", "sm")}>
                      {t.common.next}
                    </Link>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        )}
        <Card>
          <CardHeader title={t.dashboard.usage} description={ent.planName} />
          <p className="text-3xl font-bold text-fg">
            {formatNumber(usage)} <span className="text-base font-medium text-muted">/ {formatNumber(ent.monthlyReplies)}</span>
          </p>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-glass-strong" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-accent" style={{ width: `${pct}%` }} />
          </div>
        </Card>
      </div>
    </>
  );
}
