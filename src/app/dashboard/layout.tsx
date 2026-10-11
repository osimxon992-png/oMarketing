import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/shell";
import { Alert } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { requireShop } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { features } from "@/lib/env";
import { getDict } from "@/lib/i18n/server";
import { getEntitlements, getMonthlyUsage } from "@/lib/shop";
import { formatDate } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, shop } = await requireShop();
  const { t, locale } = await getDict();
  const [ent, usage, unread] = await Promise.all([
    getEntitlements(shop),
    getMonthlyUsage(shop.id),
    db.conversation.count({ where: { shopId: shop.id, unread: { gt: 0 } } }),
  ]);
  const f = features();

  const banners: React.ReactNode[] = [];
  if (ent.reason === "suspended") banners.push(<Alert key="s" tone="danger">{t.dashboard.suspended}</Alert>);
  else if (ent.reason === "expired")
    banners.push(
      <Alert key="e" tone="danger" action={<Link href="/dashboard/billing" className={buttonClass("primary", "sm")}>{t.dashboard.renew}</Link>}>
        {t.dashboard.trialEnded}
      </Alert>,
    );
  else if (ent.status === "TRIALING" && ent.endsAt.getTime() - Date.now() < 3 * 86_400_000)
    banners.push(
      <Alert key="t" tone="warning" action={<Link href="/dashboard/billing" className={buttonClass("secondary", "sm")}>{t.dashboard.renew}</Link>}>
        {t.dashboard.trialEnds} {formatDate(ent.endsAt, locale)}
      </Alert>,
    );
  if (ent.active && usage >= ent.monthlyReplies)
    banners.push(
      <Alert key="q" tone="warning" action={<Link href="/dashboard/billing" className={buttonClass("secondary", "sm")}>{t.dashboard.renew}</Link>}>
        {t.dashboard.quotaExceeded}
      </Alert>,
    );
  if (!f.ai) banners.push(<Alert key="ai" tone="info">{t.dashboard.aiNotConfigured}</Alert>);

  return (
    <DashboardShell
      shopName={shop.name}
      userName={user.name}
      isAdmin={user.role === "ADMIN"}
      inboxUnread={unread}
      banner={banners.length ? banners : undefined}
    >
      {children}
    </DashboardShell>
  );
}
