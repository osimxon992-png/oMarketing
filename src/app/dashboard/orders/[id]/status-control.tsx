"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { OrderStatus } from "@prisma/client";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { usePages } from "@/lib/i18n/use-pages";
import { cn } from "@/lib/utils/cn";

const FLOW: OrderStatus[] = ["NEW", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"];

export function StatusControl({
  orderId,
  status,
  labels,
  saved,
}: {
  orderId: string;
  status: OrderStatus;
  labels: Record<OrderStatus, string>;
  saved: string;
}) {
  const { t } = useI18n();
  const p = usePages().orders;
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState<OrderStatus | null>(null);

  async function set(next: OrderStatus) {
    setBusy(next);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast(data.error === "insufficient_stock" ? p.insufficientStock : t.errors.generic, "error");
        return;
      }
      toast(saved);
      router.refresh();
    } catch {
      toast(t.errors.generic, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {FLOW.map((s) => (
        <button
          key={s}
          type="button"
          disabled={busy !== null || s === status}
          onClick={() => set(s)}
          aria-pressed={s === status}
          className={cn(
            "rounded-2xl border px-3 py-2.5 text-sm font-medium transition disabled:cursor-default",
            s === status
              ? "border-accent bg-accent text-accent-fg"
              : s === "CANCELLED"
                ? "border-danger/40 text-danger hover:bg-danger/10"
                : "border-line text-fg hover:bg-glass-strong",
            busy === s && "opacity-60",
          )}
        >
          {labels[s]}
        </button>
      ))}
    </div>
  );
}
