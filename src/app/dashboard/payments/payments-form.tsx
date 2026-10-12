"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert, Badge, Card, CardHeader } from "@/components/ui/card";
import { FormField, Input, Switch } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { usePages } from "@/lib/i18n/use-pages";

type Config = {
  paymeEnabled: boolean;
  paymeMerchantId: string;
  paymeTestMode: boolean;
  paymeKeySet: boolean;
  clickEnabled: boolean;
  clickServiceId: string;
  clickMerchantId: string;
  clickKeySet: boolean;
};

export function PaymentsForm({ initial }: { initial: Config }) {
  const { t } = useI18n();
  const p = usePages().payments;
  const toast = useToast();
  const router = useRouter();
  const [c, setC] = useState(initial);
  const [paymeKey, setPaymeKey] = useState("");
  const [clickKey, setClickKey] = useState("");
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Config>(k: K, v: Config[K]) => setC((prev) => ({ ...prev, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/payments/config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymeEnabled: c.paymeEnabled,
          paymeMerchantId: c.paymeMerchantId,
          paymeKey: paymeKey || undefined,
          paymeTestMode: c.paymeTestMode,
          clickEnabled: c.clickEnabled,
          clickServiceId: c.clickServiceId,
          clickMerchantId: c.clickMerchantId,
          clickSecretKey: clickKey || undefined,
        }),
      });
      if (!res.ok) throw new Error();
      setPaymeKey("");
      setClickKey("");
      toast(p.saved);
      router.refresh();
    } catch {
      toast(t.errors.validation, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="space-y-4">
          <CardHeader
            title={p.payme}
            description={p.paymeText}
            action={<Switch checked={c.paymeEnabled} onChange={(v) => set("paymeEnabled", v)} label={`${p.payme} — ${p.enabled}`} />}
            className="mb-0"
          />
          <FormField label={p.merchantId}>
            {(id, d) => <Input id={id} aria-describedby={d} value={c.paymeMerchantId} onChange={(e) => set("paymeMerchantId", e.target.value)} autoComplete="off" />}
          </FormField>
          <FormField label={<span className="flex items-center gap-2">{p.key} {c.paymeKeySet && <Badge tone="success">{p.keySet}</Badge>}</span>} hint={p.keyHint}>
            {(id, d) => <Input id={id} aria-describedby={d} type="password" value={paymeKey} onChange={(e) => setPaymeKey(e.target.value)} autoComplete="new-password" />}
          </FormField>
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{p.testMode}</span>
            <Switch checked={c.paymeTestMode} onChange={(v) => set("paymeTestMode", v)} label={p.testMode} />
          </div>
        </Card>

        <Card className="space-y-4">
          <CardHeader
            title={p.click}
            description={p.clickText}
            action={<Switch checked={c.clickEnabled} onChange={(v) => set("clickEnabled", v)} label={`${p.click} — ${p.enabled}`} />}
            className="mb-0"
          />
          <FormField label={p.serviceId}>
            {(id, d) => <Input id={id} aria-describedby={d} value={c.clickServiceId} onChange={(e) => set("clickServiceId", e.target.value)} autoComplete="off" />}
          </FormField>
          <FormField label={p.clickMerchantId}>
            {(id, d) => <Input id={id} aria-describedby={d} value={c.clickMerchantId} onChange={(e) => set("clickMerchantId", e.target.value)} autoComplete="off" />}
          </FormField>
          <FormField label={<span className="flex items-center gap-2">{p.secretKey} {c.clickKeySet && <Badge tone="success">{p.keySet}</Badge>}</span>} hint={p.keyHint}>
            {(id, d) => <Input id={id} aria-describedby={d} type="password" value={clickKey} onChange={(e) => setClickKey(e.target.value)} autoComplete="new-password" />}
          </FormField>
        </Card>
      </div>
      <Alert tone="info">{p.note}</Alert>
      <Button type="submit" loading={saving}>
        {t.common.save}
      </Button>
    </form>
  );
}
