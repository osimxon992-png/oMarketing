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
import { ClayStage } from "@/components/landing/clay-stage";
import { PanelPreview } from "@/components/landing/panel-preview";
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

/** Slab colours in the collage; text on all of them is charcoal (≥5:1). */
const SLABS = ["var(--mango)", "var(--flor)", "var(--lime)", "var(--paper-hi)", "var(--guava)"] as const;
const TILTS = [-1.5, 1.2, -0.8, 1.6, -1.2, 0.9];
const tilt = (i: number): number => TILTS[i % TILTS.length] ?? 0;

const section = "mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24";

const primaryCta =
  "clay-btn inline-flex h-14 items-center justify-center gap-2 rounded-[16px] bg-mango px-7 text-[1.05rem] font-bold text-charcoal";
const paperCta =
  "clay-btn inline-flex h-14 items-center justify-center gap-2 rounded-[16px] bg-paper-hi px-7 text-[1.05rem] font-bold text-charcoal";

function slabStyle(i: number, offset = 0): React.CSSProperties {
  return { "--slab": SLABS[(i + offset) % SLABS.length], "--tilt": `${tilt((i + offset) % TILTS.length)}deg` } as React.CSSProperties;
}

/* ───────────── Shared headings ───────────── */

/** Heading in the display face; the section's label rides as a clay sticker on its corner. */
export function SectionHeading({
  label,
  title,
  subtitle,
  align = "center",
}: {
  label: string;
  title: string;
  subtitle?: string;
  align?: "center" | "left";
}) {
  return (
    <div className={cn("reveal relative", align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-xl")}>
      <h2 className="font-display text-[clamp(2rem,4.4vw,3.6rem)] leading-[1.06] tracking-[-0.02em] text-balance text-fg">{title}</h2>
      <span
        aria-hidden="true"
        className={cn(
          "slab absolute -top-9 text-sm font-bold tracking-wide uppercase [--slab:var(--lime)] [--tilt:4deg] sm:text-base",
          align === "center" ? "right-2 sm:-right-6" : "right-0",
        )}
      >
        {label}
      </span>
      {subtitle && <p className={cn("mt-5 text-base leading-relaxed text-muted sm:text-lg", align === "center" && "mx-auto max-w-2xl")}>{subtitle}</p>}
    </div>
  );
}

/** Top of every inner marketing page: a painted band, breadcrumb, slab-set heading. */
export function PageHero({ eyebrow, title, subtitle, homeLabel }: { eyebrow: string; title: string; subtitle: string; homeLabel: string }) {
  return (
    <section className="paint-field overflow-hidden rounded-b-[44px] px-4 pt-32 pb-20 sm:px-6 sm:pt-40 sm:pb-24">
      <div className="mx-auto max-w-4xl text-center">
        <nav aria-label="breadcrumb" className="text-sm font-semibold text-paper-hi">
          <Link href="/" className="underline-offset-4 hover:underline">
            {homeLabel}
          </Link>
          <span className="mx-2 text-lime" aria-hidden="true">
            /
          </span>
          <span aria-current="page">{eyebrow}</span>
        </nav>
        <h1 className="mt-7 font-display text-[clamp(2.2rem,5.6vw,4.6rem)] leading-[1.32] tracking-[-0.02em] text-balance text-charcoal">
          <span className="rounded-[0.16em] bg-mango px-[0.28em] py-[0.02em] shadow-[inset_0_0.05em_0.03em_rgba(255,255,255,0.5),inset_0_-0.07em_0.08em_rgba(0,0,0,0.2)] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">
            {title}
          </span>
        </h1>
        <p className="mx-auto mt-8 max-w-2xl rounded-[18px] bg-leaf-deep/70 px-5 py-4 text-base leading-relaxed text-paper-hi sm:text-lg">{subtitle}</p>
      </div>
    </section>
  );
}

/* ───────────── Home ───────────── */

export function Hero({ t, locale, signedIn }: { t: LandingDict; locale: Locale; signedIn: boolean }) {
  const words = t.hero.titleB.split(" ");
  return (
    <section className="paint-field relative overflow-hidden">
      <ClayStage variant="hero" />
      <div className="pointer-events-none relative z-10 mx-auto grid min-h-[100svh] max-w-[1320px] items-center gap-14 px-4 pt-28 pb-16 sm:px-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)] lg:gap-6 lg:pt-32 lg:pb-20">
        <div className="pointer-events-auto">
          <h1 className="flex flex-wrap items-center gap-x-3 gap-y-3 font-display leading-[1.05] tracking-[-0.02em] sm:gap-x-4 sm:gap-y-4">
            <span className="slab text-[clamp(1.45rem,2.7vw,2.4rem)] [--slab:var(--paper-hi)] [--tilt:-1deg]">{t.hero.titleA}</span>
            {words.map((w, i) => {
              const last = i === words.length - 1;
              return (
                <span
                  key={`${w}-${i}`}
                  className={cn("slab", last ? "text-[clamp(3rem,7.4vw,6rem)]" : "text-[clamp(2.1rem,4.6vw,4.3rem)]")}
                  style={
                    {
                      "--slab": last ? "var(--guava)" : i % 2 === 0 ? "var(--lime)" : "var(--mango)",
                      "--tilt": `${last ? 1.8 : tilt(i % TILTS.length)}deg`,
                    } as React.CSSProperties
                  }
                >
                  {w}
                </span>
              );
            })}
          </h1>
          <p className="glass mt-9 max-w-xl rotate-[0.6deg] px-5 py-4 text-base leading-relaxed text-fg sm:text-lg">{t.hero.subtitle}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href={signedIn ? "/dashboard" : "/register"} className={primaryCta}>
              {signedIn ? t.nav.dashboard : t.hero.ctaPrimary}
              <ArrowRight className="h-5 w-5" />
            </Link>
            <Link href="/how-it-works" className={paperCta}>
              {t.hero.ctaSecondary}
            </Link>
          </div>
          <ul className="mt-7 flex flex-wrap gap-2.5 text-sm font-semibold">
            {t.hero.trust.map((item, i) => (
              <li
                key={item}
                className="flex items-center gap-1.5 rounded-[10px] bg-leaf-deep px-3 py-1.5 text-paper-hi"
                style={{ transform: `rotate(${tilt((i + 2) % TILTS.length) / 2}deg)` }}
              >
                <Check className="h-4 w-4 text-lime" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="pointer-events-auto relative mx-auto w-full max-w-[430px] rotate-[2deg] lg:-ml-10">
          <span className="slab absolute -top-6 left-5 z-30 text-xs font-bold tracking-wide uppercase [--slab:var(--charcoal)] [--slab-ink:var(--paper-hi)] [--tilt:-3deg] sm:text-sm">
            {t.hero.badge}
          </span>
          <ChatPreview t={t.chat} price={formatUzs(690_000, locale)} total={formatUzs(715_000, locale)} />
        </div>
      </div>
    </section>
  );
}

/** A charcoal paper strip pasted at a tilt, the integrations rolling along it. */
export function Marquee({ items }: { items: string[] }) {
  return (
    <section aria-label="Integrations" className="relative z-10 -mt-6 -rotate-1 bg-charcoal py-4 shadow-[0_14px_30px_-12px_rgba(0,0,0,0.5)]">
      <div className="marquee overflow-hidden">
        <div className="marquee-track">
          {[0, 1].map((copy) => (
            <ul key={copy} className="flex shrink-0 items-center gap-4 pr-4" aria-hidden={copy === 1 || undefined}>
              {items.map((item, i) => (
                <li key={item} className="slab text-sm font-bold whitespace-nowrap sm:text-base" style={slabStyle(i)}>
                  {item}
                </li>
              ))}
            </ul>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The four facts as round clay stickers stuck at different sizes and tilts. */
export function Stats({ stats }: { stats: LandingDict["stats"] }) {
  const sizes = ["sm:h-56 sm:w-56", "sm:h-48 sm:w-48", "sm:h-52 sm:w-52", "sm:h-44 sm:w-44"];
  const colors = ["var(--mango)", "var(--flor)", "var(--lime)", "var(--paper-hi)"];
  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
      <ul className="grid grid-cols-2 place-items-center gap-5 sm:flex sm:flex-wrap sm:justify-center sm:gap-8">
        {stats.map((s, i) => (
          <li key={s.label} className="reveal w-full max-w-44 sm:w-auto sm:max-w-none">
            <div
            className={cn("flex aspect-square w-full flex-col items-center justify-center rounded-full p-5 text-center", sizes[i])}
            style={{
              background: colors[i],
              transform: `rotate(${tilt(i) * 3}deg) translateY(${i % 2 ? 18 : -10}px)`,
              boxShadow: "inset 0 4px 3px rgba(255,255,255,0.5), inset 0 -8px 14px rgba(0,0,0,0.16), 8px 14px 26px -8px rgba(64,44,14,0.4)",
            }}
          >
            <p className="font-display text-[2.4rem] leading-none text-charcoal sm:text-5xl">{s.value}</p>
            <p className="mt-2 max-w-[11rem] text-xs leading-snug font-semibold text-charcoal sm:text-sm">{s.label}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function Problem({ t }: { t: LandingDict["problem"] }) {
  return (
    <section className={section}>
      <SectionHeading label={t.eyebrow} title={t.title} />
      <div className="mt-14 grid gap-6 md:grid-cols-2 md:gap-8">
        <div className="reveal">
          <div className="glass -rotate-1 p-7 sm:p-9">
            <p className="slab text-sm font-bold [--slab:var(--paper)] [--tilt:-2deg]">{t.before}</p>
            <ul className="mt-6 space-y-4">
              {t.pains.map((p) => (
                <li key={p} className="flex gap-3 text-fg">
                  <span className="clay-btn mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-anor text-paper-hi">
                    <X className="h-3.5 w-3.5" />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="reveal">
          <div className="paint-field rotate-1 rounded-[22px] p-7 shadow-[var(--clay-bevel),var(--clay-cast-lifted)] sm:p-9">
            <p className="slab text-sm font-bold [--slab:var(--lime)] [--tilt:2deg]">{t.after}</p>
            <ul className="mt-6 space-y-4">
              {t.gains.map((g) => (
                <li key={g} className="flex gap-3 font-semibold text-paper-hi">
                  <span className="clay-btn mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lime text-charcoal">
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {g}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

/** Link slabs to the inner pages, cut at different widths. */
export function Explore({ t }: { t: LandingDict["explore"] }) {
  const spans = ["md:col-span-4", "md:col-span-2", "md:col-span-2", "md:col-span-4"];
  return (
    <section className={section}>
      <SectionHeading label={t.eyebrow} title={t.title} />
      <div className="mt-14 grid gap-5 md:grid-cols-6">
        {t.items.map((item, i) => (
          <div key={item.href} className={cn("reveal", spans[i])}>
            <Link
              href={item.href}
              className="lift group flex h-full min-h-56 flex-col justify-between rounded-[22px] p-7 text-charcoal sm:p-9"
              style={{
                background: SLABS[i % 4],
                transform: `rotate(${tilt(i) / 1.5}deg)`,
                boxShadow: "var(--clay-bevel), var(--clay-cast)",
              }}
            >
              <h3 className="font-display text-[1.7rem] leading-tight sm:text-[2rem]">{item.title}</h3>
              <div>
                <p className="max-w-sm leading-relaxed font-medium">{item.text}</p>
                <span className="mt-6 inline-flex items-center gap-2 rounded-[10px] bg-charcoal px-3 py-1.5 text-sm font-bold text-paper-hi transition-transform duration-300 group-hover:translate-x-1">
                  {t.more}
                  <ArrowUpRight className="h-4 w-4" />
                </span>
              </div>
            </Link>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Features ───────────── */

// Uneven cuts so the eight abilities read as a collage, not a uniform grid.
const FEATURE_SPANS = [
  "lg:col-span-4",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-2",
  "lg:col-span-3",
  "lg:col-span-3",
  "lg:col-span-6",
];

export function FeatureGrid({ t }: { t: LandingDict["features"] }) {
  return (
    <section className={section}>
      <SectionHeading label={t.eyebrow} title={t.title} subtitle={t.subtitle} />
      <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
        {t.items.map((f, i) => {
          const Icon = FEATURE_ICONS[f.icon] ?? Package;
          const big = FEATURE_SPANS[i] === "lg:col-span-4" || FEATURE_SPANS[i] === "lg:col-span-6";
          return (
            <div key={f.title} className={cn("reveal", FEATURE_SPANS[i])}>
              <article
                className="lift h-full rounded-[22px] p-6 text-charcoal sm:p-7"
                style={{ background: SLABS[i % SLABS.length], transform: `rotate(${tilt(i % TILTS.length) / 2}deg)`, boxShadow: "var(--clay-bevel), var(--clay-cast)" }}
              >
                <span className="clay-btn grid h-12 w-12 place-items-center rounded-full bg-charcoal text-paper-hi">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className={cn("mt-5 font-display leading-tight", big ? "text-2xl sm:text-[1.9rem]" : "text-xl")}>{f.title}</h3>
                <p className={cn("mt-2 leading-relaxed font-medium", big ? "max-w-lg" : "text-[0.95rem]")}>{f.text}</p>
              </article>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function PanelShowcase({ t, locale }: { t: LandingDict["panel"]; locale: Locale }) {
  return (
    <section className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[0.9fr_1.1fr]">
      <div>
        <SectionHeading label={t.eyebrow} title={t.title} subtitle={t.subtitle} align="left" />
        <ul className="mt-8 space-y-3">
          {t.points.map((p) => (
            <li key={p} className="flex items-center gap-3 font-medium text-fg">
              <span className="clay-btn grid h-7 w-7 place-items-center rounded-full bg-lime text-charcoal">
                <Check className="h-3.5 w-3.5" />
              </span>
              {p}
            </li>
          ))}
        </ul>
      </div>
      <div className="reveal">
        <div className="rotate-[1.2deg]">
          <PanelPreview t={t.mock} locale={locale} />
        </div>
      </div>
    </section>
  );
}

export function Industries({ t }: { t: LandingDict["industries"] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionHeading label={t.eyebrow} title={t.title} />
      <ul className="reveal mx-auto mt-12 flex max-w-4xl flex-wrap justify-center gap-3">
        {t.items.map((item, i) => (
          <li key={item} className="slab text-base font-bold sm:text-lg" style={slabStyle(i, 1)}>
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ───────────── How it works ───────────── */

export function Steps({ t, details }: { t: LandingDict["how"]; details?: LandingDict["stepDetails"] }) {
  return (
    <section className={section}>
      <SectionHeading label={t.eyebrow} title={t.title} />
      <ol className="relative mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <span
          className="absolute top-8 right-[10%] left-[10%] hidden border-t-[3px] border-dashed border-leaf/40 lg:block"
          aria-hidden="true"
        />
        {t.steps.map((s, i) => (
          <li key={s.title} className="reveal relative">
            <div className="glass h-full p-6 sm:p-7" style={{ transform: `rotate(${tilt(i) / 2}deg)` }}>
              <span
                className="clay-btn relative -mt-12 grid h-16 w-16 place-items-center rounded-full font-display text-2xl text-charcoal"
                style={{ background: SLABS[i % 3] }}
              >
                {i + 1}
              </span>
              <h3 className="mt-5 font-display text-xl text-fg">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{s.text}</p>
              {details?.[i] && (
                <ul className="mt-5 space-y-2 border-t border-dashed border-line pt-5 text-sm text-fg">
                  {details[i].map((d) => (
                    <li key={d} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-leaf" />
                      {d}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/* ───────────── Pricing ───────────── */

export function Compare({ t, minPrice, locale }: { t: LandingDict["compare"]; minPrice: number; locale: Locale }) {
  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-24">
      <SectionHeading label={t.eyebrow} title={t.title} />
      <div className="reveal glass mt-14 overflow-hidden !rounded-[28px]">
        <div className="grid grid-cols-[1.1fr_1fr_1fr] border-b border-line text-xs sm:text-sm">
          <span className="p-4 sm:p-5" />
          <span className="p-4 font-semibold text-muted sm:p-5">{t.colA}</span>
          <span className="bg-leaf p-4 font-display text-paper-hi sm:p-5">{t.colB}</span>
        </div>
        {t.rows.map((r, i) => (
          <div key={r.label} className={cn("grid grid-cols-[1.1fr_1fr_1fr] text-xs sm:text-sm", i < t.rows.length - 1 && "border-b border-line")}>
            <span className="p-4 font-semibold text-fg sm:p-5">{r.label}</span>
            <span className="flex items-start gap-2 p-4 text-muted sm:p-5">
              <Minus className="mt-0.5 hidden h-4 w-4 shrink-0 sm:block" />
              {r.a}
            </span>
            <span className="flex items-start gap-2 bg-lime/30 p-4 font-semibold text-fg sm:p-5">
              <Check className="mt-0.5 hidden h-4 w-4 shrink-0 text-leaf sm:block" />
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
    <section className="mx-auto max-w-6xl px-4 pt-16 pb-16 sm:px-6 sm:pb-24">
      <div className={cn("grid items-stretch gap-6", plans.length >= 3 ? "lg:grid-cols-3" : "md:grid-cols-2")}>
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
            <div key={plan.code} className={cn("reveal", featured && "lg:-my-5")}>
              <div
                className="relative flex h-full flex-col rounded-[24px] p-7 text-charcoal sm:p-8"
                style={{
                  background: featured ? "var(--mango)" : "var(--paper-hi)",
                  transform: `rotate(${featured ? 0 : tilt(i) / 2}deg)`,
                  boxShadow: featured ? "var(--clay-bevel), var(--clay-cast-lifted)" : "var(--clay-bevel), var(--clay-cast)",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <h3 className="font-display text-2xl">{plan.name}</h3>
                  {featured && (
                    <span className="slab text-xs font-bold uppercase [--slab:var(--charcoal)] [--slab-ink:var(--paper-hi)] [--tilt:4deg]">{t.popular}</span>
                  )}
                </div>
                <p className="mt-1.5 text-sm font-medium text-muted">{t.descriptions[plan.code] ?? ""}</p>
                <p className="mt-7 flex items-baseline gap-1.5">
                  <span className="font-display text-[2.6rem] leading-none tabular-nums">{formatNumber(plan.priceUzs)}</span>
                  <span className="text-sm font-semibold text-muted">
                    {locale === "ru" ? "сум" : "so'm"} {t.perMonth}
                  </span>
                </p>
                <ul className="mt-7 flex-1 space-y-3 text-sm font-medium">
                  {items.map((it) => (
                    <li key={it.label} className={cn("flex items-center gap-2.5", !it.on && "text-muted line-through")}>
                      {it.on ? <Check className="h-4 w-4 shrink-0 text-leaf" /> : <X className="h-4 w-4 shrink-0" />}
                      {it.label}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/register"
                  className={cn(
                    "clay-btn mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-[14px] text-sm font-bold",
                    featured ? "bg-charcoal text-paper-hi" : "bg-leaf text-paper-hi",
                  )}
                >
                  {t.cta}
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>
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
    <section className="mx-auto max-w-3xl px-4 pt-16 pb-16 sm:px-6 sm:pb-24">
      <div className="space-y-4">
        {items.map((item, i) => (
          <div key={item.q} className="reveal">
          <details className="faq glass group !rounded-[18px]" style={{ transform: `rotate(${tilt(i % TILTS.length) / 4}deg)` }}>
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 p-5 text-left font-semibold text-fg sm:p-6">
              {item.q}
              <span className="faq-icon clay-btn grid h-9 w-9 shrink-0 place-items-center rounded-full bg-lime text-charcoal transition-transform duration-300">
                <Plus className="h-4 w-4" />
              </span>
            </summary>
            <p className="-mt-1 px-5 pb-6 leading-relaxed text-muted sm:px-6">{item.a}</p>
          </details>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ───────────── Closing CTA ───────────── */

export function CtaBand({ t, signedIn, dashboardLabel }: { t: LandingDict["cta"]; signedIn: boolean; dashboardLabel: string }) {
  return (
    <section className={section}>
      <div className="paint-field relative overflow-hidden rounded-[40px] px-6 py-20 text-center shadow-[var(--clay-cast-lifted)] sm:px-12 sm:py-28">
        <ClayStage variant="cta" />
        <div className="pointer-events-none relative z-10">
          <h2 className="pointer-events-auto mx-auto max-w-3xl font-display text-[clamp(2.2rem,5.4vw,4.4rem)] leading-[1.32] tracking-[-0.02em] text-balance text-charcoal">
            <span className="rounded-[0.16em] bg-paper-hi px-[0.28em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">{t.title}</span>
          </h2>
          <p className="pointer-events-auto mx-auto mt-7 w-fit rounded-[12px] bg-leaf-deep/80 px-4 py-2 font-semibold text-paper-hi sm:text-lg">{t.subtitle}</p>
          <div className="pointer-events-auto mt-9 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={signedIn ? "/dashboard" : "/register"} className={primaryCta}>
              {signedIn ? dashboardLabel : t.primary}
              <ArrowRight className="h-5 w-5" />
            </Link>
            {!signedIn && (
              <Link href="/login" className={paperCta}>
                {t.secondary}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
