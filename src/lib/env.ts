import "server-only";
import { z } from "zod";

const optional = z
  .string()
  .optional()
  .transform((v) => (v && v.trim() !== "" ? v.trim() : undefined));

const schema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_URL: z
    .string()
    .url("APP_URL must be a URL like https://example.uz")
    .transform((v) => v.replace(/\/+$/, "")),
  AUTH_SECRET: z.string().min(32, "AUTH_SECRET must be at least 32 characters"),
  ENCRYPTION_KEY: z
    .string()
    .refine((v) => Buffer.from(v, "base64").length === 32, "ENCRYPTION_KEY must be 32 bytes, base64-encoded"),

  ANTHROPIC_API_KEY: optional,
  AI_MODEL: optional.transform((v) => v ?? "claude-sonnet-5-5"),
  AI_SUMMARY_MODEL: optional.transform((v) => v ?? "claude-haiku-5-5"),
  AI_EFFORT: optional.transform((v) => (v === "medium" || v === "high" ? v : "low") as "low" | "medium" | "high"),

  PLATFORM_BOT_TOKEN: optional,
  PLATFORM_BOT_USERNAME: optional.transform((v) => v?.replace(/^@/, "")),
  PLATFORM_BOT_WEBHOOK_SECRET: optional,

  INSTAGRAM_APP_ID: optional,
  INSTAGRAM_APP_SECRET: optional,
  META_WEBHOOK_VERIFY_TOKEN: optional,
  META_GRAPH_VERSION: optional.transform((v) => v ?? "v23.0"),

  PLATFORM_PAYME_MERCHANT_ID: optional,
  PLATFORM_PAYME_KEY: optional,
  PLATFORM_PAYME_TEST_MODE: optional.transform((v) => v !== "false"),
  PLATFORM_CLICK_SERVICE_ID: optional,
  PLATFORM_CLICK_MERCHANT_ID: optional,
  PLATFORM_CLICK_SECRET_KEY: optional,

  // Telegram username that subscription payments are arranged with (opens a chat on "Pay").
  PLATFORM_PAY_TELEGRAM: optional.transform((v) => (v ?? "osimxon_00").replace(/^@/, "")),
  // Owner-only /admin panel. Left empty (or too short), the panel stays locked; the rest of the site is unaffected.
  ADMIN_LOGIN: optional,
  ADMIN_PASSWORD: optional,
  CRON_SECRET: optional,
});

export type Env = z.infer<typeof schema>;

let cached: Env | undefined;

/** Validated environment. Parsed lazily so `next build` works without secrets. */
export function env(): Env {
  if (cached) return cached;
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `  - ${i.path.join(".")}: ${i.message}`).join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}\nSee .env.example.`);
  }
  cached = parsed.data;
  return cached;
}

/** Which optional integrations are configured. Used to show setup messages in the UI. */
export function features() {
  const e = env();
  return {
    ai: Boolean(e.ANTHROPIC_API_KEY),
    platformBot: Boolean(e.PLATFORM_BOT_TOKEN && e.PLATFORM_BOT_USERNAME),
    instagram: Boolean(e.INSTAGRAM_APP_ID && e.INSTAGRAM_APP_SECRET && e.META_WEBHOOK_VERIFY_TOKEN),
    platformPayme: Boolean(e.PLATFORM_PAYME_MERCHANT_ID && e.PLATFORM_PAYME_KEY),
    platformClick: Boolean(e.PLATFORM_CLICK_SERVICE_ID && e.PLATFORM_CLICK_MERCHANT_ID && e.PLATFORM_CLICK_SECRET_KEY),
    publicHttps: e.APP_URL.startsWith("https://"),
  };
}
