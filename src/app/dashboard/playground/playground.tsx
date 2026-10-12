"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, CreditCard, Package, RotateCcw } from "lucide-react";
import { Alert, PageHeader } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import { usePages } from "@/lib/i18n/use-pages";
import { cn } from "@/lib/utils/cn";
import { formatUzs } from "@/lib/utils/format";

type Card = { id: string; name: string; price: number; stock: number; image: string | null };
export type ChatItem =
  | { role: "user"; text: string }
  | { role: "bot"; text: string; products?: Card[]; payLinks?: { provider: string; url: string }[]; orderNumber?: number | null; error?: boolean };

export function Playground({ shopName, botEnabled, initial }: { shopName: string; botEnabled: boolean; initial: ChatItem[] }) {
  const { locale } = useI18n();
  const p = usePages().playground;
  const [items, setItems] = useState<ChatItem[]>(initial);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Braces matter: newer browsers return a Promise from scrollIntoView, which React would treat as a cleanup.
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [items, busy]);

  async function send(value: string) {
    const msg = value.trim();
    if (!msg || busy) return;
    setItems((prev) => [...prev, { role: "user", text: msg }]);
    setText("");
    setBusy(true);
    try {
      const res = await fetch("/api/playground", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: msg }),
      });
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { reply: Omit<Extract<ChatItem, { role: "bot" }>, "role"> | null; skipped: string | null };
      setItems((prev) => [...prev, data.reply ? { role: "bot", ...data.reply } : { role: "bot", text: p.botOff, error: true }]);
    } catch {
      setItems((prev) => [...prev, { role: "bot", text: p.failed, error: true }]);
    } finally {
      setBusy(false);
      inputRef.current?.focus();
    }
  }

  async function reset() {
    await fetch("/api/playground", { method: "DELETE" });
    setItems([]);
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-2xl flex-col">
      <PageHeader
        title={p.title}
        description={p.subtitle}
        action={
          items.length > 0 && (
            <button
              type="button"
              onClick={reset}
              className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-sm text-muted transition hover:bg-glass-strong hover:text-fg"
            >
              <RotateCcw className="h-3.5 w-3.5" /> {p.reset}
            </button>
          )
        }
      />
      {!botEnabled && (
        <Alert tone="warning" className="mb-4" action={<Link href="/dashboard/ai" className="text-sm font-semibold underline">→</Link>}>
          {p.botOff}
        </Alert>
      )}

      <div className="glass flex flex-1 flex-col overflow-hidden p-0">
        <div className="flex items-center gap-3 border-b border-line px-5 py-3.5">
          <span className="grid h-9 w-9 place-items-center rounded-full bg-fg text-page">
            <Bot className="h-4.5 w-4.5" />
          </span>
          <div>
            <p className="font-semibold text-fg">{shopName}</p>
            <p className="flex items-center gap-1.5 text-xs text-subtle">
              <span className={cn("h-1.5 w-1.5 rounded-full", botEnabled ? "bg-success" : "bg-warning")} /> bot
            </p>
          </div>
        </div>

        <ol className="flex-1 space-y-3 overflow-y-auto px-4 py-5">
          {items.length === 0 && <li className="px-2 py-10 text-center text-sm text-subtle">{p.hint}</li>}
          {items.map((it, i) => (
            <li key={i} className={cn("flex", it.role === "user" ? "justify-end" : "justify-start")}>
              <div className="max-w-[85%] space-y-2">
                <div
                  className={cn(
                    "rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap",
                    it.role === "user"
                      ? "rounded-br-lg bg-fg text-page"
                      : "error" in it && it.error
                        ? "rounded-bl-lg border border-danger/40 bg-danger/10 text-fg"
                        : "rounded-bl-lg border border-line bg-glass-strong text-fg",
                  )}
                >
                  {it.text}
                </div>
                {it.role === "bot" && it.products && it.products.length > 0 && (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {it.products.map((c) => (
                      <div key={c.id} className="flex items-center gap-3 rounded-2xl border border-line bg-glass p-2.5">
                        {c.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={c.image} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
                        ) : (
                          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-glass-strong text-subtle">
                            <Package className="h-5 w-5" />
                          </span>
                        )}
                        <span className="min-w-0 text-sm">
                          <span className="block truncate font-medium text-fg">{c.name}</span>
                          <span className="font-mono text-xs text-muted">{formatUzs(c.price, locale)}</span>
                          <span className={cn("ml-2 text-xs", c.stock > 0 ? "text-success" : "text-danger")}>{c.stock > 0 ? `${p.inStock}: ${c.stock}` : p.outStock}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {it.role === "bot" && it.payLinks && it.payLinks.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {it.payLinks.map((l) => (
                      <a
                        key={l.provider}
                        href={l.url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 rounded-full bg-fg px-4 py-2 text-sm font-semibold text-page hover:opacity-90"
                      >
                        <CreditCard className="h-4 w-4" /> {l.provider === "payme" ? "Payme" : "Click"} · {p.pay}
                      </a>
                    ))}
                  </div>
                )}
              </div>
            </li>
          ))}
          {busy && (
            <li className="flex">
              <span className="flex gap-1 rounded-3xl rounded-bl-lg border border-line bg-glass-strong px-4 py-3.5 text-muted">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </span>
            </li>
          )}
          <div ref={endRef} />
        </ol>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="border-t border-line p-3"
        >
          <div className="flex items-end gap-2 rounded-[22px] border border-line bg-field p-1.5 pl-4">
            <textarea
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  send(text);
                }
              }}
              rows={1}
              maxLength={2000}
              placeholder={p.placeholder}
              aria-label={p.placeholder}
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-[15px] text-fg [field-sizing:content] placeholder:text-subtle focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              aria-label="Send"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-fg text-page transition hover:opacity-90 disabled:opacity-35"
            >
              <ArrowUp className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
