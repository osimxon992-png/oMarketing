import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Onest } from "next/font/google";
import { cookies } from "next/headers";
import "./globals.css";
import { getDict } from "@/lib/i18n/server";
import { I18nProvider } from "@/lib/i18n/client";
import { ToastProvider } from "@/components/ui/toast";

const onest = Onest({ subsets: ["latin", "cyrillic"], variable: "--font-onest", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin", "cyrillic"], variable: "--font-mono-jb", display: "swap" });

export const metadata: Metadata = {
  title: { default: "oMarketing — Telegram va Instagram do'konlar uchun AI sotuvchi", template: "%s · oMarketing" },
  description:
    "oMarketing mijozlaringizga 24/7 javob beradi, mahsulot tavsiya qiladi, buyurtma oladi va Payme/Click to'lov havolasini yuboradi.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#070707",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { locale, t } = await getDict();
  const theme = (await cookies()).get("sotuv_theme")?.value === "light" ? "light" : "dark";
  return (
    <html lang={locale} className={`${theme} ${onest.variable} ${mono.variable}`} suppressHydrationWarning>
      <body className="min-h-screen antialiased">
        <div className="scene" aria-hidden="true">
          <div className="scene-orb o1" />
          <div className="scene-orb o2" />
          <div className="scene-orb o3" />
          <div className="scene-grid" />
          <div className="scene-grain" />
        </div>
        <I18nProvider locale={locale} t={t}>
          <ToastProvider>{children}</ToastProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
