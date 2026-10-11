"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Lock, Mail, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormField, Input } from "@/components/ui/field";
import { Alert } from "@/components/ui/card";
import { TelegramLoginButton } from "@/components/telegram-login";
import { useI18n } from "@/lib/i18n/client";
import type { Dict } from "@/lib/i18n/dictionaries";

type Field = "name" | "email" | "password";
type FieldErrors = Partial<Record<Field, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Same rules as the API schema, but with messages in the user's language. */
function validate(mode: "login" | "register", body: Record<string, string>, t: Dict): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === "register" && !body.name?.trim()) errors.name = t.auth.nameRequired;
  if (!EMAIL_RE.test(body.email?.trim() ?? "")) errors.email = t.auth.emailInvalid;
  if (!body.password) errors.password = t.auth.passwordRequired;
  else if (mode === "register" && body.password.length < 8) errors.password = t.auth.passwordShort;
  return errors;
}

function localizeServerErrors(fields: Record<string, string[] | undefined>, t: Dict): FieldErrors {
  const messages: Record<Field, string> = {
    name: t.auth.nameRequired,
    email: t.auth.emailInvalid,
    password: t.auth.passwordShort,
  };
  const out: FieldErrors = {};
  for (const key of Object.keys(messages) as Field[]) if (fields[key]?.length) out[key] = messages[key];
  return out;
}

export function AuthForm({
  mode,
  telegramBot,
  referred,
}: {
  mode: "login" | "register";
  telegramBot: string | null;
  referred?: boolean;
}) {
  const { t } = useI18n();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const body = Object.fromEntries(
      [...new FormData(e.currentTarget).entries()].map(([k, v]) => [k, typeof v === "string" ? v : ""]),
    );
    const clientErrors = validate(mode, body, t);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/auth/${mode}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, email: (body.email ?? "").trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        redirect?: string;
        error?: string;
        details?: { fieldErrors?: Record<string, string[]> };
      };
      if (!res.ok) {
        if (res.status === 429) setError(t.auth.rateLimited);
        else if (data.error === "invalid_credentials") setError(t.auth.invalidCredentials);
        else if (data.error === "email_taken") setFieldErrors({ email: t.auth.emailTaken });
        else if (data.error === "validation_error") {
          setFieldErrors(localizeServerErrors(data.details?.fieldErrors ?? {}, t));
          setError(t.errors.validation);
        } else setError(t.errors.generic);
        setLoading(false);
        return;
      }
      // Keep the button busy while the next page loads.
      router.push(data.redirect ?? "/dashboard");
      router.refresh();
    } catch {
      setError(t.errors.generic);
      setLoading(false);
    }
  }

  const clearError = (field: Field) => () => {
    if (fieldErrors[field]) setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  return (
    <div className="glass-strong edge-glow fade-in w-full max-w-[440px] !rounded-[28px] p-6 sm:p-9">
      <h1 className="text-[1.7rem] leading-tight font-semibold tracking-[-0.02em] text-fg sm:text-3xl">
        {mode === "login" ? t.auth.loginTitle : t.auth.registerTitle}
      </h1>
      <p className="mt-2 text-sm text-muted">{mode === "login" ? t.auth.loginSubtitle : t.auth.registerSubtitle}</p>

      {referred && mode === "register" && (
        <Alert tone="success" className="mt-5">
          {t.auth.referredBy}
        </Alert>
      )}

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        {mode === "register" && (
          <FormField label={t.auth.name} error={fieldErrors.name}>
            {(id, d) => (
              <IconInput icon={<User className="h-4 w-4" />}>
                <Input
                  id={id}
                  aria-describedby={d}
                  aria-invalid={Boolean(fieldErrors.name) || undefined}
                  name="name"
                  autoComplete="name"
                  placeholder={t.auth.namePlaceholder}
                  maxLength={100}
                  onChange={clearError("name")}
                  className="h-12 !pl-11"
                />
              </IconInput>
            )}
          </FormField>
        )}
        <FormField label={t.auth.email} error={fieldErrors.email}>
          {(id, d) => (
            <IconInput icon={<Mail className="h-4 w-4" />}>
              <Input
                id={id}
                aria-describedby={d}
                aria-invalid={Boolean(fieldErrors.email) || undefined}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder={t.auth.emailPlaceholder}
                onChange={clearError("email")}
                className="h-12 !pl-11"
              />
            </IconInput>
          )}
        </FormField>
        <FormField
          label={t.auth.password}
          hint={mode === "register" ? t.auth.passwordHint : undefined}
          error={fieldErrors.password}
        >
          {(id, d) => (
            <IconInput icon={<Lock className="h-4 w-4" />}>
              <Input
                id={id}
                aria-describedby={d}
                aria-invalid={Boolean(fieldErrors.password) || undefined}
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                onChange={clearError("password")}
                className="h-12 !pr-12 !pl-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute top-1/2 right-2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full text-subtle transition hover:bg-glass-strong hover:text-fg"
                aria-label={showPassword ? t.auth.hidePassword : t.auth.showPassword}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </IconInput>
          )}
        </FormField>

        {error && (
          <Alert tone="danger" className="!rounded-2xl">
            {error}
          </Alert>
        )}

        <Button type="submit" className="!mt-6 w-full" size="lg" loading={loading}>
          {mode === "login" ? t.auth.login : t.auth.register}
          {!loading && <ArrowRight className="h-4 w-4" />}
        </Button>
      </form>

      {/* Telegram sign-in only appears once the platform bot is configured. */}
      {telegramBot && (
        <>
          <div className="my-6 flex items-center gap-3 text-xs text-subtle">
            <div className="h-px flex-1 bg-[var(--glass-border)]" />
            {t.auth.orTelegram}
            <div className="h-px flex-1 bg-[var(--glass-border)]" />
          </div>
          <TelegramLoginButton botUsername={telegramBot} onError={() => setError(t.auth.telegramFailed)} />
        </>
      )}

      <p className="mt-7 text-center text-sm text-muted">
        {mode === "login" ? t.auth.noAccount : t.auth.haveAccount}{" "}
        <Link
          className="font-semibold text-fg underline decoration-[var(--glass-border)] underline-offset-4 transition hover:decoration-current"
          href={mode === "login" ? "/register" : "/login"}
        >
          {mode === "login" ? t.auth.register : t.auth.login}
        </Link>
      </p>
    </div>
  );
}

function IconInput({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-subtle">{icon}</span>
      {children}
    </div>
  );
}
