import { CheckCheck, ShoppingBag, Send, Zap } from "lucide-react";
import type { LandingDict } from "@/lib/i18n/landing";
import { cn } from "@/lib/utils/cn";

/** Static mock of a Telegram conversation handled by the AI seller. */
export function ChatPreview({ t, price, total }: { t: LandingDict["chat"]; price: string; total: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      {/* Floating notification chips */}
      <div className="float-slow glass-strong absolute -top-9 -right-4 z-20 hidden items-center gap-3 !rounded-2xl px-4 py-3 sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-fg text-page">
          <ShoppingBag className="h-4 w-4" />
        </span>
        <div className="text-left leading-tight">
          <p className="text-sm font-semibold text-fg">{t.chipOrder}</p>
          <p className="font-mono text-xs text-subtle">{total}</p>
        </div>
      </div>
      <div className="float-slow-2 glass-strong absolute -bottom-9 -left-6 z-20 hidden items-center gap-3 !rounded-2xl px-4 py-3 sm:flex">
        <span className="grid h-9 w-9 place-items-center rounded-xl border border-line bg-glass-strong text-fg">
          <Zap className="h-4 w-4" />
        </span>
        <div className="text-left leading-tight">
          <p className="text-sm font-semibold text-fg">{t.chipReply}</p>
          <p className="font-mono text-xs text-subtle">{t.chipReplyTime}</p>
        </div>
      </div>

      <div className="glass edge-glow overflow-hidden !rounded-[30px] text-left">
        {/* Chat header */}
        <div className="flex items-center gap-3 border-b border-line px-5 py-4">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-fg font-semibold text-page">N</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-fg">{t.shop}</p>
            <p className="flex items-center gap-1.5 text-xs text-subtle">
              <span className="h-1.5 w-1.5 rounded-full bg-success" />
              {t.status}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-2.5 px-4 py-5 text-[13.5px] leading-snug">
          <Bubble side="in">{t.m1}</Bubble>
          <Bubble side="out">{t.m2}</Bubble>
          <div className="ml-auto w-[78%] overflow-hidden rounded-2xl border border-line bg-glass-strong">
            <div className="relative h-24 bg-[linear-gradient(135deg,color-mix(in_srgb,var(--fg)_22%,transparent),color-mix(in_srgb,var(--fg)_4%,transparent))]">
              <svg viewBox="0 0 120 80" className="absolute inset-0 m-auto h-20 text-fg/70" fill="none" aria-hidden="true">
                <path
                  d="M48 10l12 8 12-8 18 8 10 22-12 4v30H32V44l-12-4 10-22z"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M60 18v56" stroke="currentColor" strokeWidth="1.5" strokeDasharray="3 4" />
              </svg>
            </div>
            <div className="flex items-end justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-semibold text-fg">{t.productName}</p>
                <p className="truncate text-xs text-subtle">{t.productMeta}</p>
              </div>
              <p className="shrink-0 font-mono text-xs font-semibold text-fg">{price}</p>
            </div>
          </div>
          <Bubble side="in">{t.m3}</Bubble>
          <Bubble side="out">{t.m4}</Bubble>
          <Bubble side="in">{t.m5}</Bubble>
          <Bubble side="out">
            {t.m6}
            <span className="mt-2 grid grid-cols-2 gap-1.5">
              <span className="rounded-xl bg-page/90 px-2 py-1.5 text-center text-xs font-semibold text-fg">Payme · {t.pay}</span>
              <span className="rounded-xl bg-page/90 px-2 py-1.5 text-center text-xs font-semibold text-fg">Click · {t.pay}</span>
            </span>
          </Bubble>
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          <span className="flex-1 rounded-full border border-line bg-field px-4 py-2 text-xs text-subtle">{t.input}</span>
          <span className="grid h-8 w-8 place-items-center rounded-full bg-fg text-page">
            <Send className="h-3.5 w-3.5" />
          </span>
        </div>
      </div>
    </div>
  );
}

function Bubble({ side, children }: { side: "in" | "out"; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "max-w-[82%] rounded-2xl px-3.5 py-2.5",
        side === "in"
          ? "mr-auto rounded-bl-md border border-line bg-glass-strong text-fg"
          : "ml-auto rounded-br-md bg-fg text-page",
      )}
    >
      {children}
      {side === "out" && (
        <span className="mt-1 flex justify-end opacity-60">
          <CheckCheck className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
