"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, Card, CardHeader } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/field";
import { useToast } from "@/components/ui/toast";
import { useI18n } from "@/lib/i18n/client";
import { usePages } from "@/lib/i18n/use-pages";

export function SettingsForms({
  shopName,
  userName,
  email,
  hasPassword,
  notifyConnected,
  botConfigured,
}: {
  shopName: string;
  userName: string;
  email: string | null;
  hasPassword: boolean;
  notifyConnected: boolean;
  botConfigured: boolean;
}) {
  const { t } = useI18n();
  const p = usePages().settings;
  const toast = useToast();
  const router = useRouter();
  const [shop, setShop] = useState(shopName);
  const [name, setName] = useState(userName);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function call(key: string, url: string, body: unknown, success: string) {
    setBusy(key);
    try {
      const res = await fetch(url, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast(data.error === "wrong_password" ? p.wrongPassword : t.errors.validation, "error");
        return false;
      }
      toast(success);
      router.refresh();
      return true;
    } finally {
      setBusy(null);
    }
  }

  async function connectTelegram() {
    setBusy("notify");
    const tab = window.open("about:blank", "_blank");
    try {
      const res = await fetch("/api/account/telegram", { method: "POST" });
      const data = (await res.json().catch(() => ({}))) as { url?: string };
      if (!res.ok || !data.url) throw new Error();
      if (tab) {
        tab.opener = null;
        tab.location.href = data.url;
      } else window.location.href = data.url;
      toast(p.notifyOpened);
    } catch {
      tab?.close();
      toast(t.errors.generic, "error");
    } finally {
      setBusy(null);
    }
  }

  async function disconnectTelegram() {
    setBusy("notify");
    try {
      const res = await fetch("/api/account/telegram", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast(p.saved);
      router.refresh();
    } catch {
      toast(t.errors.generic, "error");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader title={p.shop} />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            call("shop", "/api/shops/settings", { name: shop }, p.saved);
          }}
        >
          <FormField label={p.shopName}>{(id, d) => <Input id={id} aria-describedby={d} value={shop} onChange={(e) => setShop(e.target.value)} minLength={2} maxLength={80} />}</FormField>
          <Button type="submit" loading={busy === "shop"}>{t.common.save}</Button>
        </form>
      </Card>

      <Card>
        <CardHeader title={p.profile} />
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            call("name", "/api/account", { name }, p.saved);
          }}
        >
          <FormField label={p.name}>{(id, d) => <Input id={id} aria-describedby={d} value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />}</FormField>
          {email && <FormField label={p.email}>{(id) => <Input id={id} value={email} disabled />}</FormField>}
          <Button type="submit" loading={busy === "name"}>{t.common.save}</Button>
        </form>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader
          title={p.notify}
          description={botConfigured ? p.notifyText : p.notifyNoBot}
          action={notifyConnected ? <Badge tone="success">{p.notifyOn}</Badge> : undefined}
        />
        <div className="flex flex-wrap gap-2">
          {notifyConnected ? (
            <Button variant="secondary" loading={busy === "notify"} onClick={disconnectTelegram}>
              {p.notifyDisconnect}
            </Button>
          ) : (
            <Button loading={busy === "notify"} disabled={!botConfigured} onClick={connectTelegram}>
              <Send className="h-4 w-4" /> {p.notifyConnect}
            </Button>
          )}
        </div>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader title={p.password} description={hasPassword ? undefined : p.noPassword} />
        <form
          className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await call("password", "/api/account", { currentPassword: current || undefined, newPassword: next }, p.passwordChanged)) {
              setCurrent("");
              setNext("");
            }
          }}
        >
          {hasPassword && (
            <FormField label={p.current}>
              {(id, d) => <Input id={id} aria-describedby={d} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />}
            </FormField>
          )}
          <FormField label={p.next} hint={t.auth.passwordHint}>
            {(id, d) => <Input id={id} aria-describedby={d} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" minLength={8} />}
          </FormField>
          <Button type="submit" loading={busy === "password"} disabled={next.length < 8}>
            {t.common.save}
          </Button>
        </form>
      </Card>
    </div>
  );
}
