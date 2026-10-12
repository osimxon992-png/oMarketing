"use client";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { SeriesPoint } from "@/lib/admin/queries";
import { useI18n } from "@/lib/i18n/client";
import { formatNumber, formatUsd, formatUzs } from "@/lib/utils/format";

type ValueFormat = "number" | "uzs" | "usd";

/** Single-series bar chart over time. Keys are YYYY-MM-DD (day) or YYYY-MM (month). */
export function TrendChart({ data, format = "number", height = 220 }: { data: SeriesPoint[]; format?: ValueFormat; height?: number }) {
  const { locale } = useI18n();
  const fmt = (v: number) => (format === "uzs" ? formatUzs(v, locale) : format === "usd" ? formatUsd(v) : formatNumber(v));
  const compact = (v: number) =>
    format === "usd"
      ? `$${new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 2 }).format(v / 1_000_000)}`
      : new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(v);
  // 2026-10-12 → 12.10, 2026-10 → 10.26
  const tick = (key: string) => (key.length === 10 ? `${key.slice(8)}.${key.slice(5, 7)}` : `${key.slice(5)}.${key.slice(2, 4)}`);
  const total = data.reduce((s, p) => s + p.value, 0);

  return (
    <div>
      <p className="mb-3 text-2xl font-semibold tracking-tight text-fg tabular-nums">{fmt(total)}</p>
      <div style={{ height }} role="img" aria-label={data.map((p) => `${tick(p.key)}: ${fmt(p.value)}`).join(", ")}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barCategoryGap={2}>
            <CartesianGrid vertical={false} stroke="var(--glass-border)" />
            <XAxis
              dataKey="key"
              tickFormatter={tick}
              tickLine={false}
              axisLine={false}
              minTickGap={18}
              tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            />
            <YAxis
              width={44}
              allowDecimals={false}
              tickFormatter={compact}
              tickLine={false}
              axisLine={false}
              tick={{ fill: "var(--fg-subtle)", fontSize: 11 }}
            />
            <Tooltip
              cursor={{ fill: "rgba(27, 26, 23, 0.06)" }}
              content={({ active, payload, label }) =>
                active && payload?.length ? (
                  <div className="glass-strong rounded-xl px-3 py-2 text-xs shadow-lg">
                    <p className="text-subtle">{tick(String(label))}</p>
                    <p className="mt-0.5 font-semibold text-fg tabular-nums">{fmt(Number(payload[0]?.value ?? 0))}</p>
                  </div>
                ) : null
              }
            />
            <Bar dataKey="value" fill="var(--leaf)" fillOpacity={0.9} radius={[4, 4, 0, 0]} maxBarSize={28} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
