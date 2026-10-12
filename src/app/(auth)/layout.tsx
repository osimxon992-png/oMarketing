import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { ClayStage } from "@/components/landing/clay-stage";
import { Logo } from "@/components/logo";
import { LanguageSwitch } from "@/components/preferences";
import { getDict } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getDict();
  return (
    <div className="grid min-h-screen lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div className="flex min-h-screen flex-col">
        <header className="flex w-full items-center justify-between gap-3 px-4 py-5 sm:px-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Logo />
            <Link
              href="/"
              className="hidden items-center gap-1.5 rounded-[10px] px-3 py-1.5 text-sm font-semibold text-muted transition hover:bg-charcoal/[0.06] hover:text-fg sm:inline-flex"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t.auth.backHome}
            </Link>
          </div>
          <LanguageSwitch />
        </header>
        <main className="flex flex-1 items-center justify-center px-4 pt-4 pb-16 sm:px-8">{children}</main>
      </div>

      <aside className="paint-field relative hidden overflow-hidden lg:block" aria-hidden="true">
        <ClayStage variant="auth" />
        <div className="pointer-events-none relative z-10 flex h-full flex-col justify-center px-12 py-16 xl:px-16">
          <h2 className="font-display text-[clamp(2.2rem,3.4vw,3.4rem)] leading-[1.32] tracking-[-0.02em] text-charcoal">
            <span className="rounded-[0.16em] bg-mango px-[0.28em] [box-decoration-break:clone] [-webkit-box-decoration-break:clone]">{t.auth.sideTitle}</span>
          </h2>
          <ul className="mt-9 space-y-3">
            {t.auth.sidePoints.map((p, i) => (
              <li key={p} className="flex w-fit items-center gap-3 rounded-[12px] bg-leaf-deep/80 px-3.5 py-2 font-semibold text-paper-hi" style={{ transform: `rotate(${i % 2 ? 0.8 : -0.8}deg)` }}>
                <span className="clay-btn grid h-6 w-6 place-items-center rounded-full bg-lime text-charcoal">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>

          <div className="mt-12 max-w-md space-y-3 text-sm">
            <p className="mr-auto w-fit max-w-[85%] -rotate-1 rounded-[18px] rounded-bl-[6px] bg-paper-hi px-4 py-3 font-medium text-charcoal shadow-[var(--clay-bevel),var(--clay-cast)]">
              {t.auth.sideQuoteQ}
            </p>
            <p className="ml-auto w-fit max-w-[85%] rotate-1 rounded-[18px] rounded-br-[6px] bg-lime px-4 py-3 font-semibold text-charcoal shadow-[var(--clay-bevel),var(--clay-cast)]">
              {t.auth.sideQuoteA}
            </p>
          </div>
        </div>
      </aside>
    </div>
  );
}
