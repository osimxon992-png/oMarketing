import Link from "next/link";
import { Fragment } from "react";
import { buttonClass } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import type { Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";
import { formatDate } from "@/lib/utils/format";

/** Builds `/path?a=1&b=2`, dropping empty values. */
export function withQuery(path: string, params: Record<string, string | number | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") sp.set(k, String(v));
  const s = sp.toString();
  return s ? `${path}?${s}` : path;
}

export const TD = "px-5 py-3 align-top";

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mt-8 mb-3 text-xs font-semibold tracking-[0.14em] text-subtle uppercase first:mt-0">{children}</h2>;
}

export function StatGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4", className)}>{children}</div>;
}

export function Stat({ label, value, hint, href }: { label: string; value: React.ReactNode; hint?: React.ReactNode; href?: string }) {
  const body = (
    <Card className={cn("h-full", href && "transition-colors hover:border-fg/30")}>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1.5 text-3xl font-semibold tracking-tight text-fg tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-subtle">{hint}</p>}
    </Card>
  );
  return href ? (
    <Link href={href} className="block h-full">
      {body}
    </Link>
  ) : (
    body
  );
}

export function Empty({ children }: { children: React.ReactNode }) {
  return <p className="py-6 text-center text-sm text-subtle">{children}</p>;
}

export function DataTable({ columns, children, minWidth = 900 }: { columns: React.ReactNode[]; children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="text-xs text-subtle">
          <tr>
            {columns.map((c, i) => (
              <th key={i} scope="col" className="px-5 py-2 font-medium whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-[var(--glass-border)]">{children}</tbody>
      </table>
    </div>
  );
}

export function Pills({ items }: { items: { label: string; href: string; active: boolean; count?: number }[] }) {
  return (
    <nav className="flex flex-wrap gap-2">
      {items.map((it) => (
        <Link
          key={it.href}
          href={it.href}
          aria-current={it.active ? "page" : undefined}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
            it.active ? "border-fg/30 bg-fg/10 text-fg" : "border-line text-muted hover:text-fg",
          )}
        >
          {it.label}
          {it.count !== undefined && <span className="ml-1.5 text-subtle tabular-nums">{it.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

/** Plain GET form: keeps the given params, resets paging. */
export function SearchBox({
  q,
  placeholder,
  button,
  keep,
}: {
  q?: string;
  placeholder: string;
  button: string;
  keep?: Record<string, string | undefined>;
}) {
  return (
    <form role="search" className="flex w-full gap-2 sm:w-auto">
      {Object.entries(keep ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
      <Input name="q" defaultValue={q} placeholder={placeholder} aria-label={placeholder} className="h-10 min-w-0 flex-1 sm:w-72" />
      <button type="submit" className={buttonClass("secondary", "md")}>
        {button}
      </button>
    </form>
  );
}

export function Pager({
  page,
  total,
  pageSize,
  href,
  labels,
}: {
  page: number;
  total: number;
  pageSize: number;
  href: (page: number) => string;
  labels: { prev: string; next: string };
}) {
  if (total <= pageSize && page === 1) return null;
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const link = "rounded-full border border-line px-3 py-1.5 text-xs font-medium text-muted hover:text-fg";
  return (
    <div className="mt-4 flex items-center justify-between gap-3 text-sm text-subtle">
      <span className="tabular-nums">
        {from}–{to} / {total}
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className={link}>
            {labels.prev}
          </Link>
        )}
        {to < total && (
          <Link href={href(page + 1)} className={link}>
            {labels.next}
          </Link>
        )}
      </div>
    </div>
  );
}

export function SubscriptionBadge({ state, label }: { state: "paid" | "trial" | "expired"; label: string }) {
  return <Badge tone={state === "paid" ? "success" : state === "trial" ? "accent" : "danger"}>{label}</Badge>;
}

export function InvoiceBadge({ status, label }: { status: "PENDING" | "PAID" | "CANCELLED"; label: string }) {
  return <Badge tone={status === "PAID" ? "success" : status === "PENDING" ? "warning" : "neutral"}>{label}</Badge>;
}

export function EndsAt({
  end,
  now,
  locale,
  labels,
}: {
  end: Date;
  now: Date;
  locale: Locale;
  labels: { daysLeft: string; ended: string };
}) {
  const days = Math.ceil((end.getTime() - now.getTime()) / 86_400_000);
  return (
    <>
      <p className="whitespace-nowrap text-fg">{formatDate(end, locale)}</p>
      <p className={cn("text-xs whitespace-nowrap", days <= 0 ? "text-danger" : days <= 7 ? "text-warning" : "text-subtle")}>
        {days > 0 ? `${days} ${labels.daysLeft}` : labels.ended}
      </p>
    </>
  );
}

/** Label/value pairs for detail cards. */
export function Facts({ items }: { items: [React.ReactNode, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[minmax(0,42%)_minmax(0,1fr)] gap-x-4 gap-y-2.5 text-sm">
      {items.map(([k, v], i) => (
        <Fragment key={i}>
          <dt className="text-muted">{k}</dt>
          <dd className="min-w-0 break-words text-fg">{v ?? "—"}</dd>
        </Fragment>
      ))}
    </dl>
  );
}
