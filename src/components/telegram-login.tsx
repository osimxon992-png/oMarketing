"use client";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

declare global {
  interface Window {
    onTelegramAuth?: (user: Record<string, unknown>) => void;
  }
}

/** Official Telegram Login Widget. The bot's domain must be set via @BotFather /setdomain. */
export function TelegramLoginButton({ botUsername, onError }: { botUsername: string; onError: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const onErrorRef = useRef(onError);
  onErrorRef.current = onError;

  useEffect(() => {
    const onError = () => onErrorRef.current();
    window.onTelegramAuth = async (user) => {
      try {
        const res = await fetch("/api/auth/telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(user),
        });
        const data = (await res.json().catch(() => ({}))) as { redirect?: string };
        if (!res.ok) return onError();
        router.push(data.redirect ?? "/dashboard");
        router.refresh();
      } catch {
        onError();
      }
    };
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?22";
    script.async = true;
    script.setAttribute("data-telegram-login", botUsername);
    script.setAttribute("data-size", "large");
    script.setAttribute("data-radius", "14");
    script.setAttribute("data-request-access", "write");
    script.setAttribute("data-onauth", "onTelegramAuth(user)");
    const el = ref.current;
    el?.appendChild(script);
    return () => {
      if (el) el.innerHTML = "";
      delete window.onTelegramAuth;
    };
  }, [botUsername, router]);

  return <div ref={ref} className="flex min-h-10 justify-center" />;
}
