/**
 * Local-dev stand-in for the notifier webhook: Telegram can't reach localhost, so this
 * long-polls the platform bot and forwards each update to /api/notifier.
 *
 *   npm run telegram:notifier-poll     (keep it running next to `npm run dev`)
 *
 * It removes the bot's webhook while running; in production use set-notifier-webhook instead.
 */
import "dotenv/config";

const token = process.env.PLATFORM_BOT_TOKEN?.trim();
const secret = process.env.PLATFORM_BOT_WEBHOOK_SECRET?.trim();
const appUrl = (process.env.APP_URL?.trim() || "http://localhost:3000").replace(/\/+$/, "");

async function tg<T>(method: string, body: Record<string, unknown> = {}): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as { ok: boolean; result: T; description?: string };
  if (!data.ok) throw new Error(`${method}: ${data.description}`);
  return data.result;
}

async function main() {
  if (!token || !secret) throw new Error("Set PLATFORM_BOT_TOKEN and PLATFORM_BOT_WEBHOOK_SECRET in .env first.");
  await tg("deleteWebhook");
  const me = await tg<{ username: string }>("getMe");
  console.log(`Polling @${me.username} → ${appUrl}/api/notifier (Ctrl+C to stop)`);
  let offset = 0;
  for (;;) {
    try {
      const updates = await tg<{ update_id: number }[]>("getUpdates", { offset, timeout: 30, allowed_updates: ["message"] });
      for (const u of updates) {
        offset = u.update_id + 1;
        const res = await fetch(`${appUrl}/api/notifier`, {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Telegram-Bot-Api-Secret-Token": secret },
          body: JSON.stringify(u),
        });
        console.log(`update ${u.update_id} → ${res.status}`);
      }
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
