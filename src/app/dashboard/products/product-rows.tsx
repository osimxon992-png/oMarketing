"use client";
import Link from "next/link";
import { useState } from "react";
import { ImageOff } from "lucide-react";
import { Badge, Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { formatUzs } from "@/lib/utils/format";

type Row = { id: string; name: string; category: string; price: number; active: boolean; stock: number; variants: number; image: string | null };

export function ProductRows({ items }: { items: Row[] }) {
  const { t, locale } = useI18n();
  const toast = useToast();
  const [rows, setRows] = useState(items);

  async function toggle(id: string, active: boolean) {
    setRows((r) => r.map((x) => (x.id === id ? { ...x, active } : x)));
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active }),
    });
    if (!res.ok) {
      setRows((r) => r.map((x) => (x.id === id ? { ...x, active: !active } : x)));
      toast(t.errors.generic, "error");
    }
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {rows.map((p) => (
        <Card key={p.id} hover className="flex gap-3 p-3">
          <Link href={`/dashboard/products/${p.id}`} className="shrink-0">
            {p.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={p.image} alt="" className="h-20 w-20 rounded-2xl object-cover" loading="lazy" />
            ) : (
              <div className="grid h-20 w-20 place-items-center rounded-2xl bg-glass-strong text-subtle">
                <ImageOff className="h-6 w-6" />
              </div>
            )}
          </Link>
          <div className="flex min-w-0 flex-1 flex-col">
            <Link href={`/dashboard/products/${p.id}`} className="truncate font-semibold text-fg hover:underline">
              {p.name}
            </Link>
            <p className="truncate text-xs text-subtle">{p.category || "—"}</p>
            <p className="mt-1 font-semibold text-fg">{formatUzs(p.price, locale)}</p>
            <div className="mt-auto flex flex-wrap items-center gap-2 pt-1">
              {p.stock > 0 ? (
                <Badge tone="cyan">
                  {t.products.stock}: {p.stock}
                </Badge>
              ) : (
                <Badge tone="danger">{t.products.outOfStock}</Badge>
              )}
              {p.variants > 0 && (
                <Badge>
                  {p.variants} {t.products.variantsCount}
                </Badge>
              )}
            </div>
          </div>
          <div className="flex flex-col items-end justify-between">
            <Switch checked={p.active} onChange={(v) => toggle(p.id, v)} label={`${t.products.status}: ${p.name}`} />
          </div>
        </Card>
      ))}
    </div>
  );
}
