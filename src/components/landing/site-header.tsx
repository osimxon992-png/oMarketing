"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { LanguageSwitch, ThemeToggle } from "@/components/preferences";
import { buttonClass } from "@/components/ui/button";
import type { LandingDict } from "@/lib/i18n/landing";
import { cn } from "@/lib/utils/cn";

export function SiteHeader({ t, signedIn }: { t: LandingDict["nav"]; signedIn: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: "/features", label: t.features },
    { href: "/how-it-works", label: t.how },
    { href: "/pricing", label: t.pricing },
    { href: "/faq", label: t.faq },
  ];
  const isActive = (href: string) => pathname === href;

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6 sm:pt-4">
      <div
        className={cn(
          "mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 rounded-full px-3 pl-4 transition-all duration-300 sm:pl-5",
          scrolled || open ? "glass-strong !rounded-full" : "border border-transparent",
        )}
      >
        <Logo />

        <nav aria-label={t.menu} className="hidden items-center gap-1 lg:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={cn(
                "rounded-full px-3.5 py-2 text-sm transition",
                isActive(l.href) ? "bg-glass-strong font-medium text-fg" : "text-muted hover:bg-glass-strong hover:text-fg",
              )}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <LanguageSwitch className="max-sm:hidden" />
          <ThemeToggle />
          {signedIn ? (
            <Link href="/dashboard" className={buttonClass("primary", "sm", "max-sm:hidden")}>
              {t.dashboard}
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <>
              <Link href="/login" className={buttonClass("ghost", "sm", "max-md:hidden")}>
                {t.login}
              </Link>
              <Link href="/register" className={buttonClass("primary", "sm", "max-sm:hidden")}>
                {t.start}
              </Link>
            </>
          )}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg transition hover:bg-glass-strong lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={t.menu}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div id="mobile-nav" className="glass-strong fade-in mx-auto mt-2 max-w-6xl p-3 lg:hidden">
          <nav aria-label={t.menu} className="flex flex-col">
            {[{ href: "/", label: t.home }, ...links].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={isActive(l.href) ? "page" : undefined}
                className={cn(
                  "rounded-2xl px-4 py-3 text-base text-fg transition hover:bg-glass-strong",
                  isActive(l.href) && "bg-glass-strong font-medium",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="mt-2 flex flex-col gap-2 border-t border-line pt-3">
            <LanguageSwitch className="self-start sm:hidden" />
            {signedIn ? (
              <Link href="/dashboard" className={buttonClass("primary", "md")}>
                {t.dashboard}
              </Link>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/login" className={buttonClass("secondary", "md")}>
                  {t.login}
                </Link>
                <Link href="/register" className={buttonClass("primary", "md")}>
                  {t.start}
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
