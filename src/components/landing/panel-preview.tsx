import { Bot, Package, ShoppingBag, TrendingUp, Wallet } from "lucide-react";
import type { LandingDict } from "@/lib/i18n/landing";
import { formatUzs } from "@/lib/utils/format";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

const BARS = [38, 52, 44, 68, 57, 81, 74, 92, 66, 88, 79, 100];

/** Static, illustrative mock of the seller dashboard. */
export function PanelPreview({ t, locale }: { t: LandingDict["panel"]["mock"]; locale: Locale }) {
  const orders = [
    { id: "#1042", name: "Dilnoza R.", sum: 715_000, status: "paid" as const },
    { id: "#1041", name: "Sardor T.", sum: 289_000, status: "delivering" as const },
    { id: "#1040", name: "Malika A.", sum: 1_240_000, status: "new" as const },
  ];
  const statusLabel = { paid: t.paid, delivering: t.delivering, new: t.new };

  return (
    <div className="glass edge-glow overflow-hidden !rounded-[28px] p-2 text-left">
      <div className="flex items-center gap-1.5 px-3 py-2">
        <span className="h-2.5 w-2.5 rounded-full bg-fg/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-fg/25" />
        <span className="h-2.5 w-2.5 rounded-full bg-fg/25" />
        <span className="ml-3 rounded-full border border-line px-3 py-0.5 font-mono text-[11px] text-subtle">/dashboard</span>
      </div>

      <div className="grid gap-2 rounded-[22px] border border-line bg-glass p-3 sm:grid-cols-[150px_1fr] sm:p-4">
        <aside className="hidden flex-col gap-1 sm:flex">
          {[ShoppingBag, Bot, Package, Wallet].map((Icon, i) => (
            <span
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-xl px-2.5 py-2",
                i === 0 ? "bg-fg text-page" : "text-subtle",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              <span className={cn("h-1.5 rounded-full", i === 0 ? "w-14 bg-page/50" : "w-12 bg-fg/15")} />
            </span>
          ))}
        </aside>

        <div className="min-w-0">
          <p className="mb-3 text-sm font-semibold text-fg">{t.title}</p>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: t.orders, value: "12" },
              { label: t.replies, value: "348" },
              { label: t.revenue, value: "8,4M" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-line bg-glass-strong p-2.5 sm:p-3">
                <p className="truncate text-[11px] text-subtle">{s.label}</p>
                <p className="mt-1 font-mono text-lg font-semibold text-fg sm:text-xl">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-2 rounded-2xl border border-line bg-glass-strong p-3">
            <div className="mb-2 flex items-center justify-between text-[11px] text-subtle">
              <span>{t.replies}</span>
              <TrendingUp className="h-3.5 w-3.5" />
            </div>
            <div className="flex h-20 items-end gap-1.5" aria-hidden="true">
              {BARS.map((h, i) => (
                <span
                  key={i}
                  className={cn("flex-1 rounded-t-md", i === BARS.length - 1 ? "bg-fg" : "bg-fg/20")}
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>

          <div className="mt-2 rounded-2xl border border-line bg-glass-strong p-3">
            <p className="mb-2 text-[11px] text-subtle">{t.recent}</p>
            <ul className="divide-y divide-[var(--glass-border)]">
              {orders.map((o) => (
                <li key={o.id} className="flex items-center gap-2 py-2 text-xs">
                  <span className="font-mono text-subtle">{o.id}</span>
                  <span className="min-w-0 flex-1 truncate text-fg">{o.name}</span>
                  <span className="hidden font-mono text-fg sm:inline">{formatUzs(o.sum, locale)}</span>
                  <span
                    className={cn(
                      "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                      o.status === "paid" ? "border-fg bg-fg text-page" : "border-line text-muted",
                    )}
                  >
                    {statusLabel[o.status]}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
