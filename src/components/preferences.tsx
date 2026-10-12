"use client";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n/client";
import { LOCALE_COOKIE, type Locale } from "@/lib/i18n/config";
import { cn } from "@/lib/utils/cn";

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/** Two clay keys pressed into a tray; `onDark` for the leaf-green rails. */
export function LanguageSwitch({ className, onDark }: { className?: string; onDark?: boolean }) {
  const { locale, t } = useI18n();
  const router = useRouter();
  const change = (l: Locale) => {
    setCookie(LOCALE_COOKIE, l);
    router.refresh();
  };
  return (
    <div
      className={cn(
        "inline-flex rounded-xl p-1 text-xs shadow-[inset_0_2px_4px_rgba(0,0,0,0.18)]",
        onDark ? "bg-leaf-deep" : "bg-[#e6d8b8]",
        className,
      )}
      role="group"
      aria-label={t.common.language}
    >
      {(["uz", "ru"] as const).map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => change(l)}
          aria-pressed={locale === l}
          className={cn(
            "rounded-lg px-2.5 py-1 font-bold uppercase transition",
            locale === l
              ? "clay-btn bg-mango text-charcoal"
              : onDark
                ? "text-paper-hi/85 hover:text-paper-hi"
                : "text-muted hover:text-fg",
          )}
        >
          {l === "uz" ? "O'z" : "Ру"}
        </button>
      ))}
    </div>
  );
}
