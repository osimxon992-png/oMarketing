import type { Locale } from "@/lib/i18n/config";

export function formatNumber(n: number): string {
  return new Intl.NumberFormat("ru-RU").format(Math.round(n)).replace(/ /g, " ");
}

export function formatUzs(amount: number, locale: Locale = "uz"): string {
  return `${formatNumber(amount)} ${locale === "ru" ? "сум" : "so'm"}`;
}

export const TZ = "Asia/Tashkent";

export function formatDateTime(d: Date | string, locale: Locale = "uz"): string {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "uz-UZ", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(d));
}

export function formatDate(d: Date | string, locale: Locale = "uz"): string {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "uz-UZ", {
    timeZone: TZ,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(d));
}

export function formatTime(d: Date | string): string {
  return new Intl.DateTimeFormat("ru-RU", { timeZone: TZ, hour: "2-digit", minute: "2-digit" }).format(new Date(d));
}

/** Current billing period key (YYYY-MM) in Tashkent time. */
export function currentPeriod(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit" }).formatToParts(now);
  const y = parts.find((p) => p.type === "year")?.value;
  const m = parts.find((p) => p.type === "month")?.value;
  return `${y}-${m}`;
}
