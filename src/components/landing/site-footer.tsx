import Link from "next/link";
import { Logo } from "@/components/logo";
import type { LandingDict } from "@/lib/i18n/landing";

// The brand broken into syllables and pasted as slabs: the page's closing poster.
const SYLLABLES = [
  { text: "o", bg: "var(--paper-hi)", tilt: -6 },
  { text: "MAR", bg: "var(--mango)", tilt: 3 },
  { text: "KE", bg: "var(--flor)", tilt: -2 },
  { text: "TING", bg: "var(--lime)", tilt: 4 },
];

export function SiteFooter({ t }: { t: LandingDict }) {
  const columns = [
    {
      title: t.footer.product,
      links: [
        { href: "/features", label: t.nav.features },
        { href: "/how-it-works", label: t.nav.how },
        { href: "/pricing", label: t.nav.pricing },
        { href: "/faq", label: t.nav.faq },
      ],
    },
    {
      title: t.footer.account,
      links: [
        { href: "/login", label: t.nav.login },
        { href: "/register", label: t.footer.register },
      ],
    },
  ];

  return (
    <footer className="paint-field mt-10 overflow-hidden rounded-t-[44px]">
      <div className="mx-auto grid max-w-6xl gap-12 px-4 pt-16 pb-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo onDark />
          <p className="mt-4 max-w-xs text-sm font-medium text-paper-hi/90">{t.footer.tagline}</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="slab text-xs font-bold tracking-wide uppercase [--slab:var(--lime)] [--tilt:-2deg]">{col.title}</p>
            <ul className="mt-5 space-y-2.5 text-sm font-medium">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-paper-hi underline-offset-4 transition hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <p className="flex flex-wrap items-end justify-center gap-x-[1.5vw] px-4 pb-6 font-display text-[clamp(3rem,10.5vw,9rem)] leading-[0.95] select-none" aria-hidden="true">
        {SYLLABLES.map((s) => (
          <span key={s.text} className="slab" style={{ "--slab": s.bg, "--tilt": `${s.tilt}deg` } as React.CSSProperties}>
            {s.text}
          </span>
        ))}
      </p>

      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-paper-hi/20 px-4 py-6 text-xs font-medium text-paper-hi/85 sm:flex-row sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} oMarketing. {t.footer.rights}
        </p>
        <p className="font-mono">Telegram · Instagram · Payme · Click</p>
      </div>
    </footer>
  );
}
