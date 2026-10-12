"use client";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, PauseCircle, PlayCircle } from "lucide-react";
import { Alert } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { usePages } from "@/lib/i18n/use-pages";
import { cn } from "@/lib/utils/cn";
import { formatDateTime } from "@/lib/utils/format";

type Msg = { id: string; role: "CUSTOMER" | "AI" | "SELLER" | "SYSTEM"; text: string; createdAt: string };

export function Thread({
  conversationId,
  title,
  channel,
  aiPaused,
  canReply,
  messages,
}: {
  conversationId: string;
  title: string;
  channel: string;
  aiPaused: boolean;
  canReply: boolean;
  messages: Msg[];
}) {
  const { locale, t } = useI18n();
  const p = usePages().inbox;
  const toast = useToast();
  const router = useRouter();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [paused, setPaused] = useState(aiPaused);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPaused(aiPaused), [aiPaused]);
  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);
  // New customer messages arrive via webhook; refresh periodically.
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 6000);
    return () => clearInterval(id);
  }, [router]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const value = text.trim();
    if (!value || busy) return;
    setBusy(true);
    try {
      const res = await fetch(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: value }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        toast(data.error === "telegram_failed" ? p.sendFailed : t.errors.generic, "error");
        return;
      }
      setText("");
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function togglePause() {
    const next = !paused;
    setPaused(next);
    const res = await fetch(`/api/conversations/${conversationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ aiPaused: next }),
    });
    if (!res.ok) {
      setPaused(!next);
      toast(t.errors.generic, "error");
    } else router.refresh();
  }

  return (
    <div className="glass flex min-h-[70vh] flex-col overflow-hidden p-0">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-fg">{title}</h1>
          <p className="text-xs text-subtle">{channel.toLowerCase()}</p>
        </div>
        <button
          type="button"
          onClick={togglePause}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-full border px-4 text-sm transition",
            paused ? "border-warning/50 text-warning hover:bg-warning/10" : "border-line text-fg hover:bg-glass-strong",
          )}
        >
          {paused ? <PlayCircle className="h-4 w-4" /> : <PauseCircle className="h-4 w-4" />}
          {paused ? p.resumeBot : p.pauseBot}
        </button>
      </div>

      {paused && (
        <Alert tone="warning" className="mx-4 mt-4">
          {p.pausedHint}
        </Alert>
      )}

      <ol className="flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6">
        {messages.map((m) => {
          const mine = m.role !== "CUSTOMER";
          return (
            <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[80%] rounded-3xl px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap",
                  m.role === "CUSTOMER" && "rounded-bl-lg border border-line bg-glass-strong text-fg",
                  m.role === "AI" && "rounded-br-lg bg-fg/85 text-page",
                  m.role === "SELLER" && "rounded-br-lg bg-fg text-page",
                  m.role === "SYSTEM" && "border border-dashed border-line text-xs text-subtle",
                )}
              >
                <span className={cn("mb-1 flex items-center gap-1 text-[11px] font-medium", mine ? "opacity-70" : "text-subtle")}>
                  {m.role === "AI" && <Bot className="h-3 w-3" />}
                  {p.roles[m.role]} · {formatDateTime(m.createdAt, locale)}
                </span>
                {m.text.split(/(https?:\/\/\S+)/g).map((part, i) =>
                  /^https?:\/\//.test(part) ? (
                    <a key={i} href={part} target="_blank" rel="noreferrer" className="break-all underline">
                      {part}
                    </a>
                  ) : (
                    part
                  ),
                )}
              </div>
            </li>
          );
        })}
        <div ref={endRef} />
      </ol>

      {canReply && (
        <form onSubmit={send} className="border-t border-line p-3">
          {(channel === "PLAYGROUND" || channel === "DEMO") && <p className="mb-2 px-2 text-xs text-subtle">{p.testNote}</p>}
          <div className="flex items-end gap-2 rounded-[22px] border border-line bg-field p-1.5 pl-4">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  e.currentTarget.form?.requestSubmit();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={p.reply}
              aria-label={p.reply}
              className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-[15px] text-fg [field-sizing:content] placeholder:text-subtle focus:outline-none"
            />
            <button
              type="submit"
              disabled={busy || !text.trim()}
              aria-label={p.send}
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-fg text-page transition hover:opacity-90 disabled:opacity-35"
            >
              <ArrowUp className="h-4.5 w-4.5" />
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
