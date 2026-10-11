"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Check, CircleDashed } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

type Status = {
  shop: boolean;
  products: boolean;
  channel: boolean;
  payment: boolean;
  tested: boolean;
  live: boolean;
  productCount: number;
};

export function CreateShopForm() {
  const { t } = useI18n();
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setError(t.errors.generic);
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="mx-auto max-w-md p-6 sm:p-8">
      <StepDots current={0} />
      <form onSubmit={submit} className="mt-6 space-y-4">
        <FormField label={t.onboarding.shopName} error={error}>
          {(id, d) => (
            <Input
              id={id}
              aria-describedby={d}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t.onboarding.shopNamePlaceholder}
              minLength={2}
              maxLength={80}
              required
              autoFocus
            />
          )}
        </FormField>
        <Button type="submit" className="w-full" size="lg" loading={loading} disabled={name.trim().length < 2}>
          {t.onboarding.createShop}
        </Button>
      </form>
    </Card>
  );
}

function StepDots({ current }: { current: number }) {
  const { t } = useI18n();
  return (
    <ol className="flex flex-wrap items-center justify-center gap-2 text-xs">
      {t.onboarding.steps.map((label, i) => (
        <li
          key={label}
          className={cn(
            "rounded-full border px-2.5 py-1",
            i < current && "border-success/40 bg-success/15 text-success",
            i === current && "border-fg/50 bg-fg/10 font-semibold text-fg",
            i > current && "border-line text-subtle",
          )}
        >
          {i + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

export function OnboardingSteps({ status, shopName }: { status: Status; shopName: string }) {
  const { t } = useI18n();
  const router = useRouter();
  const [finishing, setFinishing] = useState(false);
  const flags = [status.shop, status.products, status.channel, status.payment, status.tested];
  const current = flags.findIndex((f) => !f);
  const currentStep = current === -1 ? 5 : current;

  const steps = [
    { title: shopName, text: "", done: true, href: null as string | null, cta: "" },
    {
      title: t.onboarding.productsTitle,
      text: `${t.onboarding.productsText} ${t.onboarding.productsCount}: ${status.productCount}.`,
      done: status.products,
      href: "/dashboard/products",
      cta: t.onboarding.addProduct,
      extra: { href: "/dashboard/products/import", label: t.onboarding.importCsv },
    },
    { title: t.onboarding.channelTitle, text: t.onboarding.channelText, done: status.channel, href: "/dashboard/channels", cta: t.nav.channels },
    { title: t.onboarding.paymentTitle, text: t.onboarding.paymentText, done: status.payment, href: "/dashboard/payments", cta: t.nav.payments },
    { title: t.onboarding.testTitle, text: t.onboarding.testText, done: status.tested, href: "/dashboard/playground", cta: t.nav.testChat },
  ];

  async function finish() {
    setFinishing(true);
    await fetch("/api/shops/onboarding", { method: "POST" });
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <StepDots current={currentStep} />
      {steps.map((s, i) => (
        <Card key={i} className={cn("flex flex-col gap-3 sm:flex-row sm:items-center", i === currentStep && "ring-1 ring-fg/40")}>
          <div
            className={cn(
              "grid h-10 w-10 shrink-0 place-items-center rounded-2xl",
              s.done ? "bg-success/20 text-success" : "bg-glass-strong text-subtle",
            )}
          >
            {s.done ? <Check className="h-5 w-5" /> : <CircleDashed className="h-5 w-5" />}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-fg">
              {i + 1}. {i === 0 ? t.onboarding.steps[0] : s.title}
              {i === 0 && <span className="text-muted"> — {s.title}</span>}
            </p>
            {s.text && <p className="mt-0.5 text-sm text-muted">{s.text}</p>}
          </div>
          {s.href && (
            <div className="flex flex-wrap gap-2">
              {"extra" in s && s.extra && (
                <Link href={`${s.extra.href}?from=onboarding`} className={buttonClass("secondary", "sm")}>
                  {s.extra.label}
                </Link>
              )}
              <Link href={`${s.href}?from=onboarding`} className={buttonClass(s.done ? "secondary" : "primary", "sm")}>
                {s.done ? t.onboarding.done : s.cta}
              </Link>
            </div>
          )}
        </Card>
      ))}
      <Card className="text-center">
        <p className="text-lg font-semibold text-fg">{t.onboarding.liveTitle}</p>
        <p className="mt-1 text-sm text-muted">{t.onboarding.liveText}</p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          <Button onClick={finish} loading={finishing} size="lg" disabled={!status.products}>
            {t.onboarding.goLive}
          </Button>
          <Link href="/dashboard" className={buttonClass("ghost", "lg")}>
            {t.common.skip}
          </Link>
        </div>
      </Card>
    </div>
  );
}
