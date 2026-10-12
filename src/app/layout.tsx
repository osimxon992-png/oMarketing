import type { Metadata, Viewport } from "next";
import { Dela_Gothic_One, JetBrains_Mono, Onest } from "next/font/google";
import "./globals.css";
import { getDict } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { ToastProvider } from "@/components/ui/toast";

const onest = Onest({ subsets: ["latin", "cyrillic"], variable: "--font-onest", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-mono-jb", display: "swap" });
const dela = Dela_Gothic_One({ weight: "400", subsets: ["latin", "cyrillic"], variable: "--font-dela", display: "swap" });

export const metadata: Metadata = {
  title: { default: "oMarketing — Telegram va Instagram do'konlar uchun AI sotuvchi", template: "%s · oMarketing" },
  description:
    "oMarketing mijozlaringizga 24/7 javob beradi, mahsulot tavsiya qiladi, buyurtma oladi va Payme/Click to'lov havolasini yuboradi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1f5a2e",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getDict();
  return (
    <html lang={locale} className={`${onest.variable} ${mono.variable} ${dela.variable}`}>
      <body className="min-h-screen antialiased">
        <div className="scene" aria-hidden="true" />
        <I18nProvider locale={locale} t={t}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
