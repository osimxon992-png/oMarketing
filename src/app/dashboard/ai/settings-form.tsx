"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { FormField, Input, Switch, Textarea } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { usePages } from "@/lib/i18n/use-pages";

type Settings = {
  aiEnabled: boolean;
  greeting: string;
  workingHours: string;
  pickupAddress: string;
  returnPolicy: string;
  deliveryZones: { name: string; price: number }[];
  faq: { q: string; a: string }[];
};

export function BotSettingsForm({ initial }: { initial: Settings }) {
  const { t } = useI18n();
  const p = usePages().ai;
  const toast = useToast();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const [saving, setSaving] = useState(false);
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setS((prev) => ({ ...prev, [k]: v }));

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/shops/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...s,
          deliveryZones: s.deliveryZones
            .filter((z) => z.name.trim())
            .map((z) => ({ name: z.name.trim(), price: Math.max(0, Math.round(z.price || 0)) })),
          faq: s.faq.filter((f) => f.q.trim().length >= 2 && f.a.trim()),
        }),
      });
      if (!res.ok) throw new Error();
      toast(p.saved);
      router.refresh();
    } catch {
      toast(t.errors.validation, "error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save} className="grid gap-4 lg:grid-cols-2">
      <Card className="lg:col-span-2">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="font-semibold text-fg">{p.enabled}</p>
            <p className="text-sm text-muted">{p.enabledHint}</p>
          </div>
          <Switch checked={s.aiEnabled} onChange={(v) => set("aiEnabled", v)} label={p.enabled} />
        </div>
      </Card>

      <Card className="space-y-4">
        <FormField label={p.greeting} hint={p.greetingHint}>
          {(id, d) => <Textarea id={id} aria-describedby={d} value={s.greeting} onChange={(e) => set("greeting", e.target.value)} maxLength={1000} />}
        </FormField>
        <FormField label={p.workingHours}>
          {(id, d) => (
            <Input id={id} aria-describedby={d} value={s.workingHours} onChange={(e) => set("workingHours", e.target.value)} placeholder={p.workingHoursPh} maxLength={200} />
          )}
        </FormField>
        <FormField label={p.pickupAddress} hint={p.pickupHint}>
          {(id, d) => (
            <Input id={id} aria-describedby={d} value={s.pickupAddress} onChange={(e) => set("pickupAddress", e.target.value)} placeholder={p.pickupAddressPh} maxLength={300} />
          )}
        </FormField>
        <FormField label={p.returnPolicy}>
          {(id, d) => <Textarea id={id} aria-describedby={d} value={s.returnPolicy} onChange={(e) => set("returnPolicy", e.target.value)} maxLength={2000} />}
        </FormField>
      </Card>

      <Card>
        <CardHeader title={p.zones} description={p.zonesHint} />
        <div className="space-y-2">
          {s.deliveryZones.map((z, i) => (
            <div key={i} className="flex gap-2">
              <Input
                value={z.name}
                onChange={(e) => set("deliveryZones", s.deliveryZones.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
                placeholder={p.zoneName}
                aria-label={p.zoneName}
                maxLength={80}
              />
              <Input
                type="number"
                min={0}
                step={1000}
                value={z.price}
                onChange={(e) => set("deliveryZones", s.deliveryZones.map((x, j) => (j === i ? { ...x, price: Number(e.target.value) } : x)))}
                placeholder={p.zonePrice}
                aria-label={p.zonePrice}
                className="w-36"
              />
              <Button variant="ghost" aria-label={t.common.delete} onClick={() => set("deliveryZones", s.deliveryZones.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => set("deliveryZones", [...s.deliveryZones, { name: "", price: 0 }])}>
            <Plus className="h-4 w-4" /> {p.addZone}
          </Button>
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title={p.faq} description={p.faqHint} />
        <div className="space-y-3">
          {s.faq.map((f, i) => (
            <div key={i} className="grid gap-2 rounded-2xl border border-line p-3 sm:grid-cols-[1fr_1.4fr_auto]">
              <Input
                value={f.q}
                onChange={(e) => set("faq", s.faq.map((x, j) => (j === i ? { ...x, q: e.target.value } : x)))}
                placeholder={p.question}
                aria-label={p.question}
                maxLength={300}
              />
              <Textarea
                value={f.a}
                onChange={(e) => set("faq", s.faq.map((x, j) => (j === i ? { ...x, a: e.target.value } : x)))}
                placeholder={p.answer}
                aria-label={p.answer}
                className="min-h-11"
                maxLength={2000}
              />
              <Button variant="ghost" aria-label={t.common.delete} onClick={() => set("faq", s.faq.filter((_, j) => j !== i))}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="secondary" size="sm" onClick={() => set("faq", [...s.faq, { q: "", a: "" }])}>
            <Plus className="h-4 w-4" /> {p.addFaq}
          </Button>
        </div>
      </Card>

      <div className="flex flex-wrap gap-2 lg:col-span-2">
        <Button type="submit" loading={saving}>
          {t.common.save}
        </Button>
        <Link href="/dashboard/playground" className={buttonClass("secondary")}>
          {p.test}
        </Link>
      </div>
    </form>
  );
}
