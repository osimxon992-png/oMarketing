import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Logo } from "@/components/logo";
import { LanguageSwitch, ThemeToggle } from "@/components/preferences";
import { getDict } from "@/lib/i18n/server";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = await getDict();
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-2 sm:gap-4">
          <Logo />
          <Link
            href="/"
            className="hidden items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-muted transition hover:bg-glass-strong hover:text-fg sm:inline-flex"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t.auth.backHome}
          </Link>
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageSwitch />
          <ThemeToggle />
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-6xl flex-1 items-center gap-10 px-4 pt-4 pb-16 sm:px-6 lg:grid-cols-[1fr_1fr] lg:gap-16">
        <div className="flex justify-center lg:justify-start">{children}</div>

        <aside className="relative hidden lg:block" aria-hidden="true">
          <div
            className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[130%] w-[130%] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,color-mix(in_srgb,var(--fg)_12%,transparent),transparent_60%)]"
          />
          <p className="font-mono text-xs tracking-[0.2em] text-subtle">oMarketing</p>
          <h2 className="mt-4 text-4xl leading-[1.08] font-semibold tracking-[-0.03em] text-balance text-fg xl:text-5xl">
            {t.auth.sideTitle}
          </h2>
          <ul className="mt-8 space-y-3">
            {t.auth.sidePoints.map((p) => (
              <li key={p} className="flex items-center gap-3 text-fg">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-fg text-page">
                  <Check className="h-3.5 w-3.5" />
                </span>
                {p}
              </li>
            ))}
          </ul>

          <div className="glass edge-glow mt-10 max-w-md space-y-2.5 !rounded-[26px] p-5 text-sm">
            <div className="flex items-center gap-3 border-b border-line pb-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-fg font-semibold text-page">N</span>
              <div className="leading-tight">
                <p className="font-semibold text-fg">Nafis Kiyim</p>
                <p className="flex items-center gap-1.5 text-xs text-subtle">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  AI · online
                </p>
              </div>
            </div>
            <p className="mr-auto w-fit max-w-[85%] rounded-2xl rounded-bl-md border border-line bg-glass-strong px-3.5 py-2.5 text-fg">
              {t.auth.sideQuoteQ}
            </p>
            <p className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-fg px-3.5 py-2.5 text-page">{t.auth.sideQuoteA}</p>
          </div>
        </aside>
      </main>
    </div>
  );
}
