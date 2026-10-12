"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AtSign, Camera, Globe, Send } from "lucide-react";
import { Button, buttonClass } from "@/components/ui/button";
import { Alert, Badge, Card } from "@/components/ui/card";
import { ConfirmButton } from "@/components/ui/confirm-button";
import { FormField, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { usePages } from "@/lib/i18n/use-pages";
import { formatDate } from "@/lib/utils/format";

type ChannelRow = {
  id: string;
  type: "TELEGRAM_BOT" | "INSTAGRAM";
  status: "ACTIVE" | "DISCONNECTED" | "ERROR";
  username: string | null;
  displayName: string | null;
  lastError: string | null;
  tokenExpiresAt: string | null;
};

export function ChannelsView({
  channels,
  instagramConfigured,
  instagramAllowed,
  appUrl,
  igResult,
  igDetail,
}: {
  channels: ChannelRow[];
  instagramConfigured: boolean;
  instagramAllowed: boolean;
  appUrl: string;
  igResult: string | null;
  igDetail: string | null;
}) {
  const { t, locale } = useI18n();
  const p = usePages().channels;
  const toast = useToast();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "warning" | "danger"; text: string } | null>(null);
  const telegram = channels.filter((c) => c.type === "TELEGRAM_BOT");
  const instagram = channels.filter((c) => c.type === "INSTAGRAM");

  async function connectTelegram(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const res = await fetch("/api/channels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string; message?: string; webhook?: string; webhookError?: string };
      if (!res.ok) {
        const text =
          data.error === "invalid_token" ? p.invalidToken : data.error === "already_used" ? p.alreadyUsed : data.error === "token_rejected" ? `${p.tokenRejected}: ${data.message}` : t.errors.generic;
        setNotice({ tone: "danger", text });
        return;
      }
      setToken("");
      toast(p.connected);
      setNotice(
        data.webhook === "ok"
          ? { tone: "success", text: p.webhookOk }
          : data.webhook === "failed"
            ? { tone: "danger", text: p.webhookFailed.replace("{err}", data.webhookError ?? "") }
            : { tone: "warning", text: p.webhookHttps.replace("{url}", appUrl) },
      );
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function disconnect(id: string) {
    const res = await fetch(`/api/channels/${id}`, { method: "DELETE" });
    if (res.ok) {
      toast(p.disconnected);
      router.refresh();
    } else toast(t.errors.generic, "error");
  }

  const statusBadge = (c: ChannelRow) => (
    <Badge tone={c.status === "ACTIVE" ? "success" : c.status === "ERROR" ? "danger" : "neutral"}>{p.status[c.status]}</Badge>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* Telegram */}
      <Card className="flex flex-col">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-fg text-page">
            <Send className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-fg">{p.telegram}</h2>
            <p className="text-sm text-muted">{p.telegramText}</p>
          </div>
        </div>
        {telegram.map((c) => (
          <div key={c.id} className="mb-3 rounded-2xl border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-fg">{c.displayName}</span>
                {c.username && <span className="text-sm text-muted">@{c.username}</span>}
                {statusBadge(c)}
              </div>
              <div className="flex gap-2">
                {c.username && (
                  <a href={`https://t.me/${c.username}`} target="_blank" rel="noreferrer" className={buttonClass("secondary", "sm")}>
                    {p.openBot}
                  </a>
                )}
                <ConfirmButton variant="ghost" size="sm" confirmLabel={t.common.yes} onConfirm={() => disconnect(c.id)}>
                  {p.disconnect}
                </ConfirmButton>
              </div>
            </div>
            {c.lastError && <p className="mt-2 text-xs text-warning">{c.lastError.includes("HTTPS") ? p.webhookHttps.replace("{url}", appUrl) : c.lastError}</p>}
          </div>
        ))}
        {notice && (
          <Alert tone={notice.tone} className="mb-3">
            {notice.text}
          </Alert>
        )}
        <form onSubmit={connectTelegram} className="mt-auto space-y-3">
          <FormField label={p.token}>
            {(id, d) => (
              <Input
                id={id}
                aria-describedby={d}
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="123456789:AAH…"
                autoComplete="off"
                spellCheck={false}
                className="font-mono text-sm"
              />
            )}
          </FormField>
          <Button type="submit" loading={busy} disabled={!token.trim()}>
            {p.connect}
          </Button>
        </form>
      </Card>

      {/* Instagram */}
      <Card className="flex flex-col">
        <div className="mb-4 flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl bg-fg text-page">
            <Camera className="h-5 w-5" />
          </span>
          <div>
            <h2 className="font-semibold text-fg">{p.instagram}</h2>
            <p className="text-sm text-muted">{p.instagramText}</p>
          </div>
        </div>
        {igResult && (
          <Alert tone={igResult === "connected" ? "success" : "danger"} className="mb-3">
            {p.igStatus[igResult] ?? igResult}
            {igDetail ? `: ${igDetail}` : ""}
          </Alert>
        )}
        {instagram.map((c) => (
          <div key={c.id} className="mb-3 rounded-2xl border border-line p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <AtSign className="h-4 w-4 text-muted" />
                <span className="font-medium text-fg">{c.username ?? c.displayName}</span>
                {statusBadge(c)}
              </div>
              <ConfirmButton variant="ghost" size="sm" confirmLabel={t.common.yes} onConfirm={() => disconnect(c.id)}>
                {p.disconnect}
              </ConfirmButton>
            </div>
            {c.tokenExpiresAt && (
              <p className="mt-2 text-xs text-subtle">
                {p.igTokenExpires}: {formatDate(c.tokenExpiresAt, locale)}
              </p>
            )}
            {c.lastError && <p className="mt-1 text-xs text-warning">{c.lastError}</p>}
          </div>
        ))}
        <div className="mt-auto">
          {!instagramConfigured ? (
            <Alert tone="info">{p.igNotConfigured}</Alert>
          ) : !instagramAllowed ? (
            <Alert tone="warning">{p.igPlan}</Alert>
          ) : (
            // A plain link: the OAuth flow needs a full-page redirect.
            <a href="/api/instagram/connect" className={buttonClass("primary")}>
              {instagram.length ? p.igReconnect : p.igConnect}
            </a>
          )}
        </div>
      </Card>

      {/* Web widget */}
      <Card className="lg:col-span-2">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-2xl border border-line bg-glass-strong text-fg">
            <Globe className="h-5 w-5" />
          </span>
          <div className="flex-1">
            <h2 className="font-semibold text-fg">{p.widget}</h2>
            <p className="text-sm text-muted">{p.widgetText}</p>
          </div>
          <Badge>{p.soon}</Badge>
        </div>
      </Card>
    </div>
  );
}
