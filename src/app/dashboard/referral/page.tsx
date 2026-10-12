import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/card";
import { requireShop } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { getDict } from "@/lib/i18n/server";
import { pagesDictionaries } from "@/lib/i18n/pages";
import { getSetting } from "@/lib/settings";
import { formatDate } from "@/lib/utils/format";
import { CopyLink } from "./copy-link";

export const metadata = { title: "Referal" };

export default async function ReferralPage() {
  const { shop } = await requireShop();
  const { locale } = await getDict();
  const p = pagesDictionaries[locale].referral;
  const [days, referrals] = await Promise.all([
    getSetting("referral_bonus_days"),
    db.shop.findMany({ where: { referredById: shop.id }, orderBy: { createdAt: "desc" }, select: { id: true, name: true, createdAt: true, referralRewardedAt: true } }),
  ]);
  const link = `${env().APP_URL}/r/${shop.referralCode}`;

  return (
    <>
      <PageHeader title={p.title} description={p.subtitle} />
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={p.link} />
          <CopyLink value={link} copyLabel={p.copy} copiedLabel={p.copied} />
        </Card>
        <Card>
          <CardHeader title={p.how} />
          <ol className="space-y-3">
            {p.steps.map((s, i) => (
              <li key={i} className="flex gap-3 text-sm text-fg">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fg font-mono text-xs text-page">{i + 1}</span>
                {s.replace("{days}", String(days))}
              </li>
            ))}
          </ol>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader title={`${p.invited} (${referrals.length})`} />
          {referrals.length === 0 ? (
            <p className="text-sm text-subtle">{p.none}</p>
          ) : (
            <ul className="divide-y divide-[var(--glass-border)]">
              {referrals.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                  <span className="font-medium text-fg">{r.name}</span>
                  <span className="text-subtle">{formatDate(r.createdAt, locale)}</span>
                  {r.referralRewardedAt && <Badge tone="success">{p.rewarded}</Badge>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
