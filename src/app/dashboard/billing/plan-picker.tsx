"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, Send, X } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert, Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { usePages } from "@/lib/i18n/use-pages";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatUzs } from "@/lib/utils/format";

type Plan = { code: string; name: string; priceUzs: number; monthlyReplies: number; instagram: boolean; webWidget: boolean };
const MONTHS = [1, 3, 6, 12] as const;

export function PlanPicker({ plans, currentCode }: { plans: Plan[]; currentCode: string | null }) {
  const { t, locale } = useI18n();
  const p = usePages().billing;
  const toast = useToast();
  const router = useRouter();
  const [months, setMonths] = useState<(typeof MONTHS)[number]>(1);
  const [busy, setBusy] = useState<string | null>(null);
  const [payUrl, setPayUrl] = useState<string | null>(null);

  async function choose(code: string) {
    setBusy(code);
    setPayUrl(null);
    // Open the tab within the click so popup blockers allow it; point it at Telegram once the invoice exists.
    const tab = window.open("about:blank", "_blank");
    try {
      const res = await fetch("/api/billing/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planCode: code, months }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { links: { provider: string; url: string }[] };
      const url = data.links[0]?.url;
      if (!url) throw new Error();
      toast(p.invoiceCreated);
      setPayUrl(url);
      if (tab) {
        tab.opener = null;
        tab.location.href = url;
      }
      router.refresh();
    } catch {
      tab?.close();
      toast(t.errors.generic, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <div className="mb-4 inline-flex rounded-full border border-line p-1" role="group">
        {MONTHS.map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMonths(m)}
            aria-pressed={months === m}
            className={cn("rounded-full px-4 py-1.5 text-sm transition", months === m ? "bg-accent text-accent-fg" : "text-muted hover:text-fg")}
          >
            {m} {p.months}
          </button>
        ))}
      </div>
      {payUrl && (
        <Alert
          tone="info"
          className="mb-4"
          action={
            <a href={payUrl} target="_blank" rel="noreferrer" className={buttonClass("primary", "sm")}>
              <Send className="h-3.5 w-3.5" /> {p.openChat}
            </a>
          }
        >
          {p.telegramNotice}
        </Alert>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        {plans.map((plan) => {
          const current = plan.code === currentCode;
          return (
            <Card key={plan.code} className={cn("flex flex-col", current && "ring-1 ring-fg/40")}>
              <p className="text-lg font-semibold text-fg">{plan.name}</p>
              <p className="mt-3 font-mono text-3xl font-semibold text-fg">
                {formatNumber(plan.priceUzs)} <span className="text-sm font-normal text-subtle">{locale === "ru" ? "сум" : "so'm"} {p.perMonth}</span>
              </p>
              <ul className="mt-5 flex-1 space-y-2 text-sm">
                <li className="flex items-center gap-2 text-fg"><Check className="h-4 w-4" /> {formatNumber(plan.monthlyReplies)} {p.replies}</li>
                <li className={cn("flex items-center gap-2", plan.instagram ? "text-fg" : "text-subtle line-through")}>
                  {plan.instagram ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} Instagram Direct
                </li>
                <li className={cn("flex items-center gap-2", plan.webWidget ? "text-fg" : "text-subtle line-through")}>
                  {plan.webWidget ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />} Web widget
                </li>
              </ul>
              <p className="mt-4 text-sm text-muted">
                {months} {p.months}: <span className="font-mono font-semibold text-fg">{formatUzs(plan.priceUzs * months, locale)}</span>
              </p>
              <Button className="mt-3" variant={current ? "secondary" : "primary"} loading={busy === plan.code} onClick={() => choose(plan.code)}>
                {current ? p.currentPlan : p.choose}
              </Button>
            </Card>
          );
        })}
      </div>
    </>
  );
}
