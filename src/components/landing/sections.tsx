import Link from "next/link";
import type { Plan } from "@prisma/client";
import {
  ArrowRight,
  ArrowUpRight,
  BellRing,
  Check,
  ClipboardCheck,
  CreditCard,
  FileSpreadsheet,
  Languages,
  MessagesSquare,
  Minus,
  Package,
  Plus,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from "lucide-react";
import { ChatPreview } from "@/components/landing/chat-preview";
import { PanelPreview } from "@/components/landing/panel-preview";
import { buttonClass } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import type { LandingDict } from "@/lib/i18n/landing";
import { DEFAULT_PLANS } from "@/lib/shop";
import { cn } from "@/lib/utils/cn";
import { formatNumber, formatUzs } from "@/lib/utils/format";

export type PublicPlan = Pick<Plan, "code" | "name" | "priceUzs" | "monthlyReplies" | "instagram" | "webWidget">;

// Marketing pages must render even when the database is unreachable.
export async function loadPlans(): Promise<readonly PublicPlan[]> {
  try {
    const plans = await db.plan.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
    if (plans.length > 0) return plans;
  } catch {}
  return DEFAULT_PLANS;
}

export async function isSignedIn(): Promise<boolean> {
  try {
    return Boolean(await getCurrentUser());
  } catch {
    return false;
  }
}

const FEATURE_ICONS: Record<string, LucideIcon> = {
  catalog: Package,
  order: ClipboardCheck,
  pay: CreditCard,
  bell: BellRing,
  inbox: MessagesSquare,
  lang: Languages,
  import: FileSpreadsheet,
  tune: SlidersHorizontal,
};

// Column spans for the 8-card bento grid on large screens.
const FEATURE_SPANS = ["lg:col-span-2", "lg:col-span-2", "", "", "", "", "lg:col-span-2", "lg:col-span-2"];

const section = "mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24";

/* ───────────── Shared headings ───────────── */

export function SectionHeading({
  index,
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  index?: string;
  eyebrow: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("reveal", align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-xl")}>
      <p className="font-mono text-xs tracking-[0.2em] text-subtle uppercase">
        {index && (
          <>
            {index} <span className="mx-1.5 opacity-50">/</span>{" "}
          </>
        )}
        {eyebrow}
      </p>
      <h2 className="mt-4 text-3xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-fg sm:text-5xl">{title}</h2>
      {subtitle && <p className={cn("mt-4 leading-relaxed text-muted sm:text-lg", align === "center" && "mx-auto max-w-2xl")}>{subtitle}</p>}
    </div>
  );
}

/** Top of every inner marketing page. */
export function PageHero({ eyebrow, title, subtitle }: { eyebrow: string; title: string; subtitle: string }) {
  return (
    <section className="relative mx-auto max-w-4xl px-4 pt-36 pb-6 text-center sm:px-6 sm:pt-44">
      <span className="glass inline-flex items-center gap-2 !rounded-full px-3.5 py-1.5 font-mono text-xs tracking-wide text-muted uppercase">
        <span className="h-1.5 w-1.5 rounded-full bg-fg" />
        {eyebrow}
      </span>
      <h1 className="mt-6 text-[2.4rem] leading-[1.04] font-semibold tracking-[-0.035em] text-balance text-fg sm:text-6xl">
        <span className="text-silver">{title}</span>
      </h1>
      <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted sm:text-lg">{subtitle}</p>
    </section>
  );
}

/* ───────────── Home ───────────── */

export function Hero({ t, locale, signedIn }: { t: LandingDict; locale: Locale; signedIn: boolean }) {
  return (
    <section className="relative mx-auto grid max-w-6xl items-center gap-16 px-4 pt-32 pb-20 sm:px-6 sm:pt-40 lg:grid-cols-[1.1fr_1fr] lg:gap-10 lg:pb-28">
      <div className="text-center lg:text-left">
        <span className="glass inline-flex items-center gap-2 !rounded-full px-3.5 py-1.5 font-mono text-xs text-muted">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fg opacity-40" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-fg" />
          </span>
          {t.hero.badge}
        </span>
        <h1 className="mt-6 text-[2.6rem] leading-[1.03] font-semibold tracking-[-0.035em] text-balance text-fg sm:text-6xl lg:text-[4.1rem]">
          {t.hero.titleA} <span className="text-silver">{t.hero.titleB}</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg lg:mx-0">{t.hero.subtitle}</p>
        <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
          <Link href={signedIn ? "/dashboard" : "/register"} className={buttonClass("primary", "lg", "w-full sm:w-auto")}>
            {signedIn ? t.nav.dashboard : t.hero.ctaPrimary}
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href="/how-it-works" className={buttonClass("secondary", "lg", "w-full !rounded-full sm:w-auto")}>
            {t.hero.ctaSecondary}
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-subtle lg:justify-start">
          {t.hero.trust.map((item) => (
            <li key={item} className="flex items-center gap-1.5">
              <Check className="h-4 w-4 text-fg" />
              {item}
            </li>
          ))}
        </ul>
      </div>

      <div className="relative">
        <div
          className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[120%] w-[120%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--fg)_14%,transparent),transparent_60%)]"
          aria-hidden="true"
        />
        <ChatPreview t={t.chat} price={formatUzs(690_000, locale)} total={formatUzs(715_000, locale)} />
      </div>
    </section>
  );
}

export function Marquee({ items }: { items: string[] }) {
  return (
    <section aria-label="Integrations" className="border-y border-line bg-glass py-5">
      <div className="marquee overflow-hidden">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0 items-center" aria-hidden={copy === 1 || undefined}>
              {items.map((item) => (
                <li key={item} className="flex items-center gap-10 pr-10 font-mono text-sm tracking-wide whitespace-nowrap text-muted uppercase">
                  {item}
                  <span className="h-1 w-1 rounded-full bg-fg/40" />
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

export function Stats({ stats }: { stats: LandingDict["stats"] }) {
  return (
    <section className="reveal mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <div className="glass grid grid-cols-2 !rounded-[28px] lg:grid-cols-4">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={cn(
              "p-6 sm:p-8",
              i % 2 === 1 && "border-l border-line",
              i >= 2 && "border-t border-line lg:border-t-0",
              i === 2 && "lg:border-l",
            )}
          >
            <p className="font-mono text-4xl font-semibold tracking-tight text-fg sm:text-5xl">{s.value}</p>
            <p className="mt-2 text-sm text-muted">{s.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function Problem({ t }: { t: LandingDict["problem"] }) {
  return (
    <section className={section}>
      <SectionHeading index="01" eyebrow={t.eyebrow} title={t.title} />
      <div className="reveal mt-12 grid gap-4 md:grid-cols-2">
        <div className="glass p-7 sm:p-9">
          <p className="font-mono text-xs tracking-[0.2em] text-subtle uppercase">{t.before}</p>
          <ul className="mt-6 space-y-4">
            {t.pains.map((p) => (
              <li key={p} className="flex gap-3 text-muted">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border border-line">
                  <X className="h-3.5 w-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[22px] bg-fg p-7 text-page shadow-[0_30px_80px_-30px_color-mix(in_srgb,var(--fg)_50%,transparent)] sm:p-9">
          <p className="font-mono text-xs tracking-[0.2em] uppercase opacity-60">{t.after}</p>
          <ul className="mt-6 space-y-4">
            {t.gains.map((g) => (
              <li key={g} className="flex gap-3 font-medium">
                <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-page text-fg">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {g}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

/** Link cards to the inner pages. */
export function Explore({ t }: { t: LandingDict["explore"] }) {
  return (
    <section className={section}>
      <SectionHeading index="02" eyebrow={t.eyebrow} title={t.title} />
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {t.items.map((item, i) => (
          <Link
            key={item.href}
            href={item.href}
            className="reveal glass lift group relative flex min-h-56 flex-col justify-between overflow-hidden p-7 sm:p-9"
          >
            <span className="font-mono text-xs tracking-[0.2em] text-subtle">{String(i + 1).padStart(2, "0")}</span>
            <div>
              <h3 className="text-2xl font-semibold tracking-tight text-fg sm:text-3xl">{item.title}</h3>
              <p className="mt-2 max-w-sm leading-relaxed text-muted">{item.text}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-fg">
                {t.more}
                <span className="grid h-8 w-8 place-items-center rounded-full border border-line transition-all duration-300 group-hover:bg-fg group-hover:text-page">
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </span>
            </div>
            <span
              className="pointer-events-none absolute -top-16 -right-16 h-48 w-48 rounded-full border border-line opacity-60 transition-transform duration-500 group-hover:scale-125"
              aria-hidden="true"
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Features ───────────── */

export function FeatureGrid({ t, index }: { t: LandingDict["features"]; index?: string }) {
  return (
    <section className={section}>
      <SectionHeading index={index} eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {t.items.map((f, i) => {
          const Icon = FEATURE_ICONS[f.icon] ?? Package;
          const wide = FEATURE_SPANS[i] !== "";
          return (
            <article key={f.title} className={cn("reveal glass lift group relative overflow-hidden p-6 sm:p-7", FEATURE_SPANS[i])}>
              <span
                className={cn(
                  "grid h-11 w-11 place-items-center rounded-2xl border border-line transition-colors duration-300",
                  wide ? "bg-fg text-page" : "bg-glass-strong text-fg group-hover:bg-fg group-hover:text-page",
                )}
              >
                <Icon className="h-5 w-5" />
              </span>
              <h3 className={cn("mt-6 font-semibold tracking-tight text-fg", wide ? "text-xl sm:text-2xl" : "text-lg")}>{f.title}</h3>
              <p className={cn("mt-2 leading-relaxed text-muted", wide ? "max-w-md" : "text-sm")}>{f.text}</p>
              {wide && (
                <span
                  className="pointer-events-none absolute -right-10 -bottom-10 h-40 w-40 rounded-full border border-line opacity-60 transition-transform duration-500 group-hover:scale-125"
                  aria-hidden="true"
                />
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

export function PanelShowcase({ t, locale, index }: { t: LandingDict["panel"]; locale: Locale; index?: string }) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <SectionHeading index={index} eyebrow={t.eyebrow} title={t.title} subtitle={t.subtitle} align="left" />
        <ul className="mt-8 space-y-3">
          {t.points.map((p) => (
            <li key={p} className="flex items-center gap-3 text-fg">
              <span className="grid h-6 w-6 place-items-center rounded-full bg-fg text-page">
                <Check className="h-3.5 w-3.5" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="reveal">
        <PanelPreview t={t.mock} locale={locale} />
      </div>
    </section>
  );
}

export function Industries({ t, index }: { t: LandingDict["industries"]; index?: string }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeading index={index} eyebrow={t.eyebrow} title={t.title} />
      <ul className="reveal mx-auto mt-10 flex max-w-4xl flex-wrap justify-center gap-2.5">
        {t.items.map((item) => (
          <li key={item} className="glass !rounded-full px-5 py-2.5 text-sm text-fg transition hover:bg-fg hover:text-page">
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── How it works ───────────── */

export function Steps({ t, details, index }: { t: LandingDict["how"]; details?: LandingDict["stepDetails"]; index?: string }) {
  return (
    <section className={section}>
      <SectionHeading index={index} eyebrow={t.eyebrow} title={t.title} />
      <ol className="relative mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <span
          className="absolute top-[52px] right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-transparent via-[var(--glass-border)] to-transparent lg:block"
          aria-hidden="true"
        />
        {t.steps.map((s, i) => (
          <li key={s.title} className="reveal glass relative p-6 sm:p-7">
            <span className="relative grid h-14 w-14 place-items-center rounded-full border border-line bg-page font-mono text-lg font-semibold text-fg">
              {String(i + 1).padStart(2, "0")}
            </span>
            <h3 className="mt-6 text-lg font-semibold tracking-tight text-fg">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
            {details?.[i] && (
              <ul className="mt-5 space-y-2 border-t border-line pt-5 text-sm text-fg">
                {details[i].map((d) => (
                  <li key={d} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0" />
                    {d}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Pricing ───────────── */

export function Compare({ t, minPrice, locale, index }: { t: LandingDict["compare"]; minPrice: number; locale: Locale; index?: string }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading index={index} eyebrow={t.eyebrow} title={t.title} />
      <div className="reveal glass mt-12 overflow-hidden !rounded-[28px]">
        <div className="grid grid-cols-[1.1fr_1fr_1fr] border-b border-line text-xs sm:text-sm">
          <span className="p-4 sm:p-5" />
          <span className="p-4 font-medium text-muted sm:p-5">{t.colA}</span>
          <span className="bg-fg p-4 font-semibold text-page sm:p-5">{t.colB}</span>
        </div>
        {t.rows.map((r, i) => (
          <div key={r.label} className={cn("grid grid-cols-[1.1fr_1fr_1fr] text-xs sm:text-sm", i < t.rows.length - 1 && "border-b border-line")}>
            <span className="p-4 font-medium text-fg sm:p-5">{r.label}</span>
            <span className="flex items-start gap-2 p-4 text-muted sm:p-5">
              <Minus className="mt-0.5 hidden h-4 w-4 shrink-0 opacity-50 sm:block" />
              {r.a}
            </span>
            <span className="flex items-start gap-2 bg-fg/[0.06] p-4 font-medium text-fg sm:p-5">
              <Check className="mt-0.5 hidden h-4 w-4 shrink-0 sm:block" />
              {r.b.replace("{price}", formatUzs(minPrice, locale))}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PricingPlans({ t, plans, locale }: { t: LandingDict["pricing"]; plans: readonly PublicPlan[]; locale: Locale }) {
  const popularIndex = plans.length >= 3 ? 1 : -1;
  return (
    <section className="mx-auto max-w-6xl px-4 pt-10 pb-16 sm:px-6 sm:pb-24">
      <div className={cn("grid items-stretch gap-4", plans.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2")}>
        {plans.map((plan, i) => {
          const featured = i === popularIndex;
          const items: { label: string; on: boolean }[] = [
            { label: t.replies.replace("{n}", formatNumber(plan.monthlyReplies)), on: true },
            { label: t.telegram, on: true },
            { label: t.payments, on: true },
            { label: t.import, on: true },
            { label: t.instagram, on: plan.instagram },
            { label: t.widget, on: plan.webWidget },
          ];
          return (
            <div
              key={plan.code}
              className={cn(
                "reveal relative flex flex-col p-7 sm:p-8",
                featured
                  ? "rounded-[22px] bg-fg text-page shadow-[0_40px_100px_-40px_color-mix(in_srgb,var(--fg)_60%,transparent)] lg:-my-4 lg:py-12"
                  : "glass text-fg",
              )}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                {featured && (
                  <span className="rounded-full bg-page px-3 py-1 font-mono text-[11px] font-medium tracking-wide text-fg uppercase">{t.popular}</span>
                )}
              </div>
              <p className={cn("mt-1.5 text-sm", featured ? "opacity-65" : "text-muted")}>{t.descriptions[plan.code] ?? ""}</p>
              <p className="mt-7 flex items-baseline gap-1.5">
                <span className="font-mono text-4xl font-semibold tracking-tight">{formatNumber(plan.priceUzs)}</span>
                <span className={cn("text-sm", featured ? "opacity-65" : "text-subtle")}>
                  {locale === "ru" ? "сум" : "so'm"} {t.perMonth}
                </span>
              </p>
              <ul className="mt-7 flex-1 space-y-3 text-sm">
                {items.map((it) => (
                  <li key={it.label} className={cn("flex items-center gap-2.5", !it.on && "line-through opacity-40")}>
                    {it.on ? <Check className="h-4 w-4 shrink-0" /> : <X className="h-4 w-4 shrink-0" />}
                    {it.label}
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className={cn(
                  "mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-full text-sm font-medium transition-all duration-200 active:scale-[0.98]",
                  featured ? "bg-page text-fg hover:opacity-90" : "border border-line bg-glass-strong text-fg hover:bg-fg hover:text-page",
                )}
              >
                {t.cta}
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ───────────── FAQ ───────────── */

export function FaqList({ items }: { items: LandingDict["faq"]["items"] }) {
  return (
    <section className="mx-auto max-w-3xl px-4 pt-10 pb-16 sm:px-6 sm:pb-24">
      <div className="space-y-3">
        {items.map((item) => (
          <details key={item.q} className="faq reveal glass group !rounded-2xl">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left font-medium text-fg sm:p-6">
              {item.q}
              <span className="faq-icon grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line transition-transform duration-300">
                <Plus className="h-4 w-4" />
              </span>
            </summary>
            <p className="-mt-1 px-5 pb-6 leading-relaxed text-muted sm:px-6">{item.a}</p>
          </details>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Closing CTA ───────────── */

export function CtaBand({ t, signedIn, dashboardLabel }: { t: LandingDict["cta"]; signedIn: boolean; dashboardLabel: string }) {
  return (
    <section className={section}>
      <div className="reveal glass-strong edge-glow relative overflow-hidden !rounded-[36px] px-6 py-16 text-center sm:px-12 sm:py-24">
        {[320, 520, 720, 920].map((size) => (
          <span
            key={size}
            className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-line"
            style={{ width: size, height: size }}
            aria-hidden="true"
          />
        ))}
        <h2 className="relative mx-auto max-w-3xl text-4xl leading-[1.05] font-semibold tracking-[-0.03em] text-balance text-fg sm:text-6xl">
          {t.title}
        </h2>
        <p className="relative mx-auto mt-5 max-w-xl text-muted sm:text-lg">{t.subtitle}</p>
        <div className="relative mt-9 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href={signedIn ? "/dashboard" : "/register"} className={buttonClass("primary", "lg")}>
            {signedIn ? dashboardLabel : t.primary}
            <ArrowRight className="h-4 w-4" />
          </Link>
          {!signedIn && (
            <Link href="/login" className={buttonClass("secondary", "lg", "!rounded-full")}>
              {t.secondary}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
