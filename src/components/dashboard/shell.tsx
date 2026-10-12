"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, Menu, X } from "lucide-react";
import { Logo } from "@/components/logo";
import { LanguageSwitch } from "@/components/preferences";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";
import { NAV_ITEMS } from "./nav-items";

export function DashboardShell({
  shopName,
  userName,
  inboxUnread,
  banner,
  children,
}: {
  shopName: string;
  userName: string;
  inboxUnread: number;
  banner?: React.ReactNode;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/dashboard" ? pathname === href : pathname.startsWith(href));

  const nav = (
    <nav aria-label={t.nav.menu} className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {NAV_ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-[13px] px-3 py-2.5 text-sm font-semibold transition-colors duration-200",
              active ? "clay-btn bg-lime text-charcoal" : "text-paper-hi/90 hover:bg-leaf-deep/70 hover:text-paper-hi",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1 truncate">{t.nav[item.key]}</span>
            {item.key === "inbox" && inboxUnread > 0 && (
              <span className="rounded-full bg-mango px-2 py-0.5 text-[11px] font-bold text-charcoal">{inboxUnread}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="mt-4 space-y-3 border-t border-paper-hi/20 pt-4">
      <div className="flex items-center justify-between">
        <LanguageSwitch onDark />
      </div>
      <div className="flex items-center gap-3">
        <div className="clay-btn grid h-9 w-9 shrink-0 place-items-center rounded-full bg-mango font-display text-sm text-charcoal">
          {userName.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-paper-hi">{shopName}</p>
          <p className="truncate text-xs text-paper-hi/80">{userName}</p>
        </div>
        <button
          type="button"
          onClick={logout}
          className="rounded-xl p-2 text-paper-hi/85 transition hover:bg-leaf-deep/70 hover:text-paper-hi"
          aria-label={t.common.logout}
          title={t.common.logout}
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 p-3 lg:block">
        <div className="paint-field flex h-full flex-col rounded-[24px] p-4 shadow-[var(--clay-bevel),var(--clay-cast)]">
          <Logo href="/dashboard" onDark className="mb-6 px-1" />
          {nav}
          {footer}
        </div>
      </aside>

      {/* Mobile top bar + drawer */}
      <div className="fixed inset-x-0 top-0 z-40 p-2 lg:hidden">
        <div className="paint-field flex items-center justify-between rounded-[18px] px-3 py-2 shadow-[var(--clay-cast)]">
          <Logo href="/dashboard" onDark />
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl p-2 text-paper-hi hover:bg-leaf-deep/70"
            aria-label={t.nav.menu}
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={t.nav.menu}>
          <button className="absolute inset-0 bg-black/50" aria-label={t.common.close} onClick={() => setOpen(false)} />
          <div className="paint-field fade-in absolute inset-y-2 left-2 flex w-[min(20rem,calc(100%-1rem))] flex-col rounded-[24px] p-4">
            <div className="mb-6 flex items-center justify-between">
              <Logo href="/dashboard" onDark />
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-paper-hi hover:bg-leaf-deep/70" aria-label={t.common.close}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-3 pt-20 pb-10 sm:px-6 lg:px-8 lg:pt-6">
        {banner && <div className="mb-5 space-y-3">{banner}</div>}
        {children}
      </main>
    </div>
  );
}
