"use client";
import { Fragment, useEffect, useRef, useState } from "react";
import { ArrowUp, BrainCircuit, RotateCcw, ShieldCheck } from "lucide-react";
import { Alert } from "@/components/ui/card";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils/cn";

type Turn = { role: "user" | "assistant"; content: string; error?: boolean };
type StreamEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "done" }
  | { type: "error"; code: "refusal" | "failed" };

export function AssistantChat({ shopId, shopName, configured }: { shopId: string; shopName: string; configured: boolean }) {
  const { t } = useI18n();
  const storageKey = `sotuv_assistant_${shopId}`;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<"thinking" | "working" | null>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Keep the conversation across reloads within this browser tab.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) setTurns(JSON.parse(saved) as Turn[]);
    } catch {}
  }, [storageKey]);
  useEffect(() => {
    try {
      sessionStorage.setItem(storageKey, JSON.stringify(turns));
    } catch {}
  }, [turns, storageKey]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns, status]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function ask(question: string) {
    const text = question.trim();
    if (!text || busy) return;
    // Failed answers are shown but never sent back as history.
    const history = [...turns.filter((x) => !x.error), { role: "user" as const, content: text }].slice(-30);
    while (history.length && history[0]?.role !== "user") history.shift();
    setTurns((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setInput("");
    setBusy(true);
    setStatus("thinking");

    const update = (fn: (last: Turn) => Turn) =>
      setTurns((prev) => {
        const last = prev[prev.length - 1];
        return last?.role === "assistant" ? [...prev.slice(0, -1), fn(last)] : prev;
      });
    const fail = (message: string) => update((last) => ({ ...last, content: last.content || message, error: !last.content }));

    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        fail(res.status === 429 ? t.assistant.rateLimited : res.status === 503 ? t.assistant.notConfigured : t.assistant.failed);
        return;
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += value;
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as StreamEvent;
          if (event.type === "text") {
            setStatus(null);
            update((last) => ({ ...last, content: last.content + event.text }));
          } else if (event.type === "tool") {
            setStatus("working");
          } else if (event.type === "error") {
            fail(event.code === "refusal" ? t.assistant.refusal : t.assistant.failed);
          }
        }
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) fail(t.assistant.failed);
    } finally {
      setBusy(false);
      setStatus(null);
      abortRef.current = null;
      inputRef.current?.focus();
    }
  }

  function reset() {
    abortRef.current?.abort();
    setTurns([]);
    setInput("");
  }

  const empty = turns.length === 0;

  return (
    <div className="mx-auto flex min-h-[calc(100vh-8rem)] max-w-3xl flex-col">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold tracking-tight text-fg sm:text-3xl">{t.assistant.title}</h1>
          <p className="mt-1 text-sm text-muted sm:text-base">{shopName}</p>
        </div>
        {!empty && (
          <button
            type="button"
            onClick={reset}
            className="inline-flex h-9 items-center gap-2 rounded-full border border-line px-4 text-sm text-muted transition hover:bg-glass-strong hover:text-fg"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t.assistant.newChat}
          </button>
        )}
      </div>

      {!configured && (
        <Alert tone="warning" className="mb-5">
          {t.assistant.notConfigured}
        </Alert>
      )}

      <div className="flex-1">
        {empty ? (
          <div className="glass edge-glow fade-in p-6 sm:p-8">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fg text-page">
              <BrainCircuit className="h-6 w-6" />
            </span>
            <p className="mt-5 max-w-lg text-lg font-medium text-fg">{t.assistant.subtitle}</p>
            <p className="mt-6 font-mono text-xs tracking-[0.2em] text-subtle uppercase">{t.assistant.suggestionsTitle}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {t.assistant.suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  disabled={!configured || busy}
                  onClick={() => ask(s)}
                  className="rounded-2xl border border-line bg-glass px-4 py-3 text-left text-sm text-fg transition hover:bg-fg hover:text-page disabled:pointer-events-none disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <ol className="space-y-5" aria-live="polite">
            {turns.map((turn, i) => {
              const pending = busy && i === turns.length - 1 && turn.role === "assistant" && !turn.content;
              return (
                <li key={i} className={cn("fade-in flex gap-3", turn.role === "user" && "justify-end")}>
                  {turn.role === "assistant" && (
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full bg-fg text-page">
                      <BrainCircuit className="h-4 w-4" />
                    </span>
                  )}
                  <div
                    className={cn(
                      "max-w-[85%] text-[15px] leading-relaxed",
                      turn.role === "user"
                        ? "rounded-3xl rounded-br-lg bg-fg px-4 py-2.5 whitespace-pre-wrap text-page"
                        : turn.error
                          ? "rounded-3xl rounded-tl-lg border border-danger/40 bg-danger/10 px-4 py-3 text-fg"
                          : "glass rounded-3xl rounded-tl-lg px-4 py-3 text-fg",
                    )}
                  >
                    {pending ? (
                      <span className="flex items-center gap-2 text-sm text-muted">
                        <span className="flex gap-1">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </span>
                        {status === "working" ? t.assistant.working : t.assistant.thinking}
                      </span>
                    ) : turn.role === "assistant" ? (
                      <RichText text={turn.content} />
                    ) : (
                      turn.content
                    )}
                    {!pending && busy && i === turns.length - 1 && status === "working" && (
                      <span className="mt-2 flex items-center gap-2 text-xs text-subtle">
                        <span className="typing-dot" />
                        {t.assistant.working}
                      </span>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(input);
        }}
        className="sticky bottom-3 mt-6"
      >
        <div className="glass-strong flex items-end gap-2 !rounded-[26px] p-2 pl-4">
          <label htmlFor="assistant-input" className="sr-only">
            {t.assistant.placeholder}
          </label>
          <textarea
            id="assistant-input"
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                ask(input);
              }
            }}
            rows={1}
            maxLength={4000}
            placeholder={t.assistant.placeholder}
            disabled={!configured}
            className="max-h-40 min-h-10 flex-1 resize-none bg-transparent py-2.5 text-[15px] text-fg [field-sizing:content] placeholder:text-subtle focus:outline-none disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!configured || busy || !input.trim()}
            aria-label={t.assistant.send}
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-fg text-page transition hover:opacity-90 disabled:opacity-35"
          >
            <ArrowUp className="h-4.5 w-4.5" />
          </button>
        </div>
        <p className="mt-2 flex items-center justify-center gap-1.5 text-center text-xs text-subtle">
          <ShieldCheck className="h-3.5 w-3.5" />
          {t.assistant.disclaimer}
        </p>
      </form>
    </div>
  );
}

/** Renders the assistant's light formatting: paragraphs, "- " bullet lists and **bold**. */
function RichText({ text }: { text: string }) {
  const blocks: { list: boolean; lines: string[] }[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trimEnd();
    const bullet = /^\s*[-•*]\s+/.test(line);
    if (!line.trim()) {
      blocks.push({ list: false, lines: [] });
      continue;
    }
    const last = blocks[blocks.length - 1];
    const content = bullet ? line.replace(/^\s*[-•*]\s+/, "") : line;
    if (last && last.list === bullet && last.lines.length) last.lines.push(content);
    else blocks.push({ list: bullet, lines: [content] });
  }
  return (
    <div className="space-y-2.5">
      {blocks
        .filter((b) => b.lines.length)
        .map((b, i) =>
          b.list ? (
            <ul key={i} className="space-y-1">
              {b.lines.map((l, j) => (
                <li key={j} className="flex gap-2">
                  <span className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-fg/60" />
                  <span>
                    <Inline text={l} />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p key={i}>
              {b.lines.map((l, j) => (
                <Fragment key={j}>
                  {j > 0 && <br />}
                  <Inline text={l} />
                </Fragment>
              ))}
            </p>
          ),
        )}
    </div>
  );
}

function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
        part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
          <strong key={i} className="font-semibold">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}
