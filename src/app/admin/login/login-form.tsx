"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/client";
import { useAdminDict } from "@/lib/i18n/use-admin";

export function AdminLoginForm({ configured }: { configured: boolean }) {
  const { t } = useI18n();
  const p = useAdminDict().auth;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: form.get("login"), password: form.get("password") }),
      });
      if (res.ok) {
        router.replace("/admin");
        router.refresh();
        return;
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      setError(
        data.error === "invalid_credentials" || data.error === "validation_error"
          ? p.invalidCredentials
          : data.error === "rate_limited"
            ? p.tooManyAttempts
            : t.errors.generic,
      );
    } catch {
      setError(t.errors.generic);
    }
    setBusy(false);
  }

  return (
    <div className="glass-strong fade-in w-full max-w-[400px] !rounded-[28px] p-6 sm:p-9">
      <h1 className="font-display text-2xl tracking-[-0.01em] text-fg">{p.loginTitle}</h1>
      {!configured ? (
        <Alert tone="danger" className="mt-5">
          {p.notConfigured}
        </Alert>
      ) : (
        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          {error && <Alert tone="danger">{error}</Alert>}
          <FormField label={p.login}>
            {(id, describedBy) => (
              <Input id={id} aria-describedby={describedBy} name="login" autoComplete="username" required className="h-12" />
            )}
          </FormField>
          <FormField label={p.password}>
            {(id, describedBy) => (
              <Input
                id={id}
                aria-describedby={describedBy}
                name="password"
                type="password"
                autoComplete="current-password"
                required
                className="h-12"
              />
            )}
          </FormField>
          <Button type="submit" size="lg" loading={busy} className="w-full">
            {p.signIn}
          </Button>
        </form>
      )}
    </div>
  );
}
