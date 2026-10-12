"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BrainCircuit,
  LayoutDashboard,
  LogOut,
  Menu,
  MessagesSquare,
  Radio,
  Settings,
  ShoppingBag,
  Store,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { Logo } from "@/components/logo";
import { LanguageSwitch } from "@/components/preferences";
import { useI18n } from "@/lib/i18n/client";
import { useAdminDict } from "@/lib/i18n/use-admin";
import { cn } from "@/lib/utils/cn";

const ITEMS = [
  { href: "/admin", key: "overview", icon: LayoutDashboard },
  { href: "/admin/users", key: "users", icon: Users },
  { href: "/admin/shops", key: "shops", icon: Store },
  { href: "/admin/payments", key: "payments", icon: Wallet },
  { href: "/admin/orders", key: "orders", icon: ShoppingBag },
  { href: "/admin/conversations", key: "conversations", icon: MessagesSquare },
  { href: "/admin/ai", key: "ai", icon: BrainCircuit },
  { href: "/admin/channels", key: "channels", icon: Radio },
  { href: "/admin/settings", key: "settings", icon: Settings },
] as const;

export function AdminShell({ badges, children }: { badges: Partial<Record<(typeof ITEMS)[number]["key"], number>>; children: React.ReactNode }) {
  const a = useAdminDict();
  const { t } = useI18n();
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  useEffect(() => setOpen(false), [pathname]);

  async function logout() {
    setLeaving(true);
    await fetch("/api/admin/logout", { method: "POST" }).catch(() => null);
    router.replace("/admin/login");
    router.refresh();
  }

  const isActive = (href: string) => (href === "/admin" ? pathname === href : pathname.startsWith(href));

  const brand = (
    <div className="flex items-center gap-2.5">
      <Logo href="/admin" onDark />
      <span className="slab text-[10px] font-bold tracking-wide [--slab:var(--mango)] [--tilt:4deg]">ADMIN</span>
    </div>
  );

  const nav = (
    <nav aria-label={a.nav.menu} className="flex flex-1 flex-col gap-1 overflow-y-auto">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.href);
        const badge = badges[item.key] ?? 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-[13px] px-3 py-2.5 text-sm font-semibold transition-colors duration-200",
              active ? "clay-btn bg-lime text-charcoal" : "text-paper-hi/90 hover:bg-leaf-deep/70 hover:text-paper-hi",
            )}
          >
            <Icon className="h-[18px] w-[18px] shrink-0" />
            <span className="flex-1 truncate">{a.nav[item.key]}</span>
            {badge > 0 && <span className="rounded-full bg-mango px-2 py-0.5 text-[11px] font-bold text-charcoal tabular-nums">{badge}</span>}
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
      <button
        type="button"
        onClick={logout}
        disabled={leaving}
        className="flex w-full items-center gap-3 rounded-[13px] px-3 py-2.5 text-sm font-semibold text-paper-hi/90 transition hover:bg-leaf-deep/70 hover:text-paper-hi disabled:opacity-60"
      >
        <LogOut className="h-[18px] w-[18px]" />
        {a.auth.logout}
      </button>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 p-3 lg:block">
        <div className="paint-field flex h-full flex-col rounded-[24px] p-4 shadow-[var(--clay-bevel),var(--clay-cast)]">
          <div className="mb-6 px-1">{brand}</div>
          {nav}
          {footer}
        </div>
      </aside>

      <div className="fixed inset-x-0 top-0 z-40 p-2 lg:hidden">
        <div className="paint-field flex items-center justify-between rounded-[18px] px-3 py-2 shadow-[var(--clay-cast)]">
          {brand}
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-xl p-2 text-paper-hi hover:bg-leaf-deep/70"
            aria-label={a.nav.menu}
            aria-expanded={open}
          >
            <Menu className="h-5 w-5" />
          </button>
        </div>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label={a.nav.menu}>
          <button className="absolute inset-0 bg-black/50" aria-label={t.common.close} onClick={() => setOpen(false)} />
          <div className="paint-field fade-in absolute inset-y-2 left-2 flex w-[min(20rem,calc(100%-1rem))] flex-col rounded-[24px] p-4">
            <div className="mb-6 flex items-center justify-between">
              {brand}
              <button onClick={() => setOpen(false)} className="rounded-xl p-2 text-paper-hi hover:bg-leaf-deep/70" aria-label={t.common.close}>
                <X className="h-5 w-5" />
              </button>
            </div>
            {nav}
            {footer}
          </div>
        </div>
      )}

      <main className="min-w-0 flex-1 px-3 pt-20 pb-12 sm:px-6 lg:px-8 lg:pt-6">
        <div className="mx-auto w-full max-w-[1600px]">{children}</div>
      </main>
    </div>
  );
}
