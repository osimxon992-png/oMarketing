import { CheckCheck, ShoppingBag, Send, Zap } from "lucide-react";
import type { LandingDict } from "@/lib/i18n/landing";
import { cn } from "@/lib/utils/cn";

/** Static mock of a Telegram conversation handled by the AI seller, cut out of clay. */
export function ChatPreview({ t, price, total }: { t: LandingDict["chat"]; price: string; total: string }) {
  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      {/* Stickers pasted on the phone's edges */}
      <div className="float-slow absolute top-[38%] -right-10 z-20 hidden items-center gap-3 rounded-[16px] bg-mango px-4 py-3 shadow-[var(--clay-bevel),var(--clay-cast-lifted)] [--tilt:4deg] sm:flex">
        <span className="clay-btn grid h-9 w-9 place-items-center rounded-full bg-charcoal text-paper-hi">
          <ShoppingBag className="h-4 w-4" />
        </span>
        <div className="text-left leading-tight text-charcoal">
          <p className="text-sm font-bold">{t.chipOrder}</p>
          <p className="font-mono text-xs font-semibold">{total}</p>
        </div>
      </div>
      <div className="float-slow-2 absolute -bottom-8 -left-7 z-20 hidden items-center gap-3 rounded-[16px] bg-lime px-4 py-3 shadow-[var(--clay-bevel),var(--clay-cast-lifted)] [--tilt:-3deg] sm:flex">
        <span className="clay-btn grid h-9 w-9 place-items-center rounded-full bg-charcoal text-lime">
          <Zap className="h-4 w-4" />
        </span>
        <div className="text-left leading-tight text-charcoal">
          <p className="text-sm font-bold">{t.chipReply}</p>
          <p className="font-mono text-xs font-semibold">{t.chipReplyTime}</p>
        </div>
      </div>

      <div className="glass-strong overflow-hidden !rounded-[30px] text-left">
        {/* Chat header */}
        <div className="flex items-center gap-3 bg-leaf px-5 py-4 text-paper-hi">
          <span className="clay-btn grid h-10 w-10 place-items-center rounded-full bg-mango font-display text-charcoal">N</span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{t.shop}</p>
            <p className="flex items-center gap-1.5 text-xs font-medium text-paper-hi/90">
              <span className="h-1.5 w-1.5 rounded-full bg-lime" />
              {t.status}
            </p>
          </div>
        </div>

        {/* Messages */}
        <div className="flex flex-col gap-2.5 px-4 py-5 text-[13.5px] leading-snug">
          <Bubble side="in">{t.m1}</Bubble>
          <Bubble side="out">{t.m2}</Bubble>
          <div className="ml-auto w-[78%] overflow-hidden rounded-[18px] bg-paper shadow-[var(--clay-bevel)]">
            <div className="relative h-24 bg-flor">
              <svg viewBox="0 0 120 80" className="absolute inset-0 m-auto h-20 text-charcoal" fill="none" aria-hidden="true">
                <path
                  d="M48 10l12 8 12-8 18 8 10 22-12 4v30H32V44l-12-4 10-22z"
                  fill="#1b1a17"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinejoin="round"
                />
                <path d="M60 18v56" stroke="#f08a9a" strokeWidth="1.5" strokeDasharray="3 4" />
              </svg>
            </div>
            <div className="flex items-end justify-between gap-2 px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-bold text-fg">{t.productName}</p>
                <p className="truncate text-xs text-muted">{t.productMeta}</p>
              </div>
              <p className="shrink-0 font-mono text-xs font-bold text-fg">{price}</p>
            </div>
          </div>
          <Bubble side="in">{t.m3}</Bubble>
          <Bubble side="out">{t.m4}</Bubble>
          <Bubble side="in">{t.m5}</Bubble>
          <Bubble side="out">
            {t.m6}
            <span className="mt-2 grid grid-cols-2 gap-1.5">
              <span className="clay-btn rounded-[10px] bg-mango px-2 py-1.5 text-center text-xs font-bold text-charcoal">Payme · {t.pay}</span>
              <span className="clay-btn rounded-[10px] bg-guava px-2 py-1.5 text-center text-xs font-bold text-charcoal">Click · {t.pay}</span>
            </span>
          </Bubble>
        </div>

        {/* Composer */}
        <div className="flex items-center gap-2 border-t border-line px-4 py-3">
          <span className="flex-1 rounded-[12px] bg-field px-4 py-2 text-xs text-subtle shadow-[inset_0_2px_4px_rgba(90,64,24,0.14)]">{t.input}</span>
          <span className="clay-btn grid h-8 w-8 place-items-center rounded-full bg-leaf text-paper-hi">
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
        "max-w-[82%] rounded-[18px] px-3.5 py-2.5 shadow-[var(--clay-bevel)]",
        side === "in" ? "mr-auto rounded-bl-[6px] bg-paper text-fg" : "ml-auto rounded-br-[6px] bg-lime font-medium text-charcoal",
      )}
    >
      {children}
      {side === "out" && (
        <span className="mt-1 flex justify-end text-leaf">
          <CheckCheck className="h-3 w-3" />
        </span>
      )}
    </div>
  );
}
