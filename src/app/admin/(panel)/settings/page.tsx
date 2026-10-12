import { DataTable, Facts, TD } from "@/components/admin/ui";
import { Badge, Card, CardHeader, PageHeader } from "@/components/ui/card";
import { adminContext } from "@/lib/admin/context";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";
import { getSetting } from "@/lib/settings";
import { formatNumber, formatUzs } from "@/lib/utils/format";

export const metadata = { title: "Settings" };

export default async function AdminSettingsPage() {
  const { a, locale } = await adminContext();
  const x = a.settings;
  const [trial, commission, referralDays, plans] = await Promise.all([
    getSetting("trial_limits"),
    getSetting("commission_percent"),
    getSetting("referral_bonus_days"),
    db.plan.findMany({ orderBy: { sortOrder: "asc" }, include: { _count: { select: { shops: true } } } }),
  ]);
  const e = env();
  const f = features();
  const onOff = (v: boolean) => <Badge tone={v ? "success" : "neutral"}>{v ? x.on : x.off}</Badge>;
  const yesNo = (v: boolean) => (v ? a.common.yes : a.common.no);

  return (
    <>
      <PageHeader title={a.nav.settings} description={x.subtitle} />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader title={x.trial} />
          <Facts
            items={[
              [x.trialDays, formatNumber(trial.days)],
              [x.monthlyReplies, formatNumber(trial.monthlyReplies)],
              [x.instagram, yesNo(trial.instagram)],
              [x.webWidget, yesNo(trial.webWidget)],
              [x.commission, `${commission}%`],
              [x.referralBonus, formatNumber(referralDays)],
            ]}
          />
        </Card>

        <Card>
          <CardHeader title={x.integrations} />
          <Facts
            items={[
              [x.claude, onOff(f.ai)],
              [x.platformBot, onOff(f.platformBot)],
              [x.instagram, onOff(f.instagram)],
              [x.payme, onOff(f.platformPayme)],
              [x.click, onOff(f.platformClick)],
              [x.https, onOff(f.publicHttps)],
            ]}
          />
        </Card>

        <Card>
          <CardHeader title={x.app} />
          <Facts
            items={[
              [x.appUrl, <span key="u" className="font-mono text-xs">{e.APP_URL}</span>],
              [x.mainModel, <span key="m" className="font-mono text-xs">{e.AI_MODEL}</span>],
              [x.summaryModel, <span key="s" className="font-mono text-xs">{e.AI_SUMMARY_MODEL}</span>],
              [x.effort, e.AI_EFFORT],
              [x.platformBot, e.PLATFORM_BOT_USERNAME ? `@${e.PLATFORM_BOT_USERNAME}` : "—"],
              [x.payTelegram, `@${e.PLATFORM_PAY_TELEGRAM}`],
            ]}
          />
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader title={x.plans} />
        <DataTable
          minWidth={800}
          columns={[x.code, a.common.plan, x.pricePerMonth, x.monthlyReplies, x.instagram, x.webWidget, x.shopsOnPlan, a.common.status]}
        >
          {plans.map((p) => (
            <tr key={p.id}>
              <td className={`${TD} font-mono text-muted`}>{p.code}</td>
              <td className={`${TD} font-medium text-fg`}>{p.name}</td>
              <td className={`${TD} font-mono whitespace-nowrap`}>{formatUzs(p.priceUzs, locale)}</td>
              <td className={`${TD} tabular-nums`}>{formatNumber(p.monthlyReplies)}</td>
              <td className={TD}>{yesNo(p.instagram)}</td>
              <td className={TD}>{yesNo(p.webWidget)}</td>
              <td className={`${TD} tabular-nums`}>{formatNumber(p._count.shops)}</td>
              <td className={TD}>
                <Badge tone={p.active ? "success" : "neutral"}>{p.active ? a.shopStatus.ACTIVE : "—"}</Badge>
              </td>
            </tr>
          ))}
        </DataTable>
      </Card>
    </>
  );
}
