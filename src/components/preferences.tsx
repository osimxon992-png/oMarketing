"use client";
import { useRouter } from "next/navigation";
import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function ThemeToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    setTheme(document.documentElement.classList.contains("light") ? "light" : "dark");
  }, []);
  const toggle = () => {
    const next = theme === "dark" ? "light" : "dark";
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(next);
    setCookie("sotuv_theme", next);
    setTheme(next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      className={cn("inline-flex h-9 w-9 items-center justify-center rounded-full text-fg transition hover:bg-glass-strong", className)}
      aria-label={`${t.common.theme}: ${theme === "dark" ? t.common.themeLight : t.common.themeDark}`}
      title={t.common.theme}
    >
      {theme === "dark" ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
    </button>
  );
}

export function LanguageSwitch({ className }: { className?: string }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const change = (l: Locale) => {
    setCookie(LOCALE_COOKIE, l);
    router.refresh();
  };
  return (
    <div className={cn("inline-flex rounded-full border border-line p-0.5 text-xs", className)} role="group" aria-label={t.common.language}>
      {(["uz", "ru"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => change(l)}
          aria-pressed={locale === l}
          className={cn(
            "rounded-full px-2.5 py-1 font-semibold uppercase transition",
            locale === l ? "bg-accent text-accent-fg" : "text-muted hover:text-fg",
          )}
        >
          {l === "uz" ? "O'z" : "Ру"}
        </button>
      ))}
    </div>
  );
}
