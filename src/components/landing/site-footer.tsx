import Link from "next/link";
import { Logo } from "@/components/logo";
import type { LandingDict } from "@/lib/i18n/landing";

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
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-4 max-w-xs text-sm text-muted">{t.footer.tagline}</p>
        </div>
        {columns.map((col) => (
          <div key={col.title}>
            <p className="font-mono text-xs tracking-[0.2em] text-subtle uppercase">{col.title}</p>
            <ul className="mt-4 space-y-2.5 text-sm">
              {col.links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="text-muted transition hover:text-fg">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto flex max-w-6xl flex-col gap-2 border-t border-line px-4 py-6 text-xs text-subtle sm:flex-row sm:justify-between sm:px-6">
        <p>
          © {new Date().getFullYear()} oMarketing. {t.footer.rights}
        </p>
        <p className="font-mono">Telegram · Instagram · Payme · Click</p>
      </div>
      <p
        className="pointer-events-none overflow-hidden text-center text-[15vw] leading-[0.8] font-semibold tracking-[-0.06em] text-transparent select-none [-webkit-text-stroke:1px_var(--glass-border)]"
        aria-hidden="true"
      >
        oMarketing
      </p>
    </footer>
  );
}
