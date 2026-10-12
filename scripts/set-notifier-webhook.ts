/**
 * Points the platform notifier bot at this app (run once after setting the bot vars):
 *
 *   npm run telegram:set-notifier-webhook
 *
 * Needs PLATFORM_BOT_TOKEN, PLATFORM_BOT_WEBHOOK_SECRET and an https APP_URL in .env.
 */
import "dotenv/config";

async function main() {
  const token = process.env.PLATFORM_BOT_TOKEN?.trim();
  const secret = process.env.PLATFORM_BOT_WEBHOOK_SECRET?.trim();
  const appUrl = process.env.APP_URL?.trim().replace(/\/+$/, "");
  if (!token || !secret || !appUrl) throw new Error("Set PLATFORM_BOT_TOKEN, PLATFORM_BOT_WEBHOOK_SECRET and APP_URL in .env first.");
  if (!appUrl.startsWith("https://")) throw new Error(`Telegram only calls https webhooks; APP_URL is ${appUrl}. Use a tunnel or your production domain.`);

  const url = `${appUrl}/api/notifier`;
  const res = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url, secret_token: secret, allowed_updates: ["message"] }),
  });
  const data = (await res.json()) as { ok: boolean; description?: string };
  if (!data.ok) throw new Error(`setWebhook failed: ${data.description}`);
  console.log(`Notifier webhook set to ${url}`);
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
