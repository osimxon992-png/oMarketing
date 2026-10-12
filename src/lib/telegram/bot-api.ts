import "server-only";

/** Minimal Telegram Bot API client for shop bots (token is per shop, so no shared client). */
export class TelegramApiError extends Error {
  constructor(
    public method: string,
    public description: string,
    public code?: number,
  ) {
    super(`Telegram ${method}: ${description}`);
  }
}

async function call<T>(token: string, method: string, body?: Record<string, unknown>): Promise<T> {
  const res = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
    signal: AbortSignal.timeout(15_000),
  });
  const data = (await res.json().catch(() => ({}))) as { ok?: boolean; result?: T; description?: string; error_code?: number };
  if (!data.ok) throw new TelegramApiError(method, data.description ?? `HTTP ${res.status}`, data.error_code);
  return data.result as T;
}

export type TgUser = { id: number; is_bot: boolean; first_name: string; last_name?: string; username?: string };

export const getMe = (token: string) => call<TgUser>(token, "getMe");

export const setWebhook = (token: string, url: string, secretToken: string) =>
  call<boolean>(token, "setWebhook", { url, secret_token: secretToken, allowed_updates: ["message"], drop_pending_updates: true });

export const deleteWebhook = (token: string) => call<boolean>(token, "deleteWebhook", { drop_pending_updates: false });

export const sendMessage = (token: string, chatId: string | number, text: string) =>
  call<{ message_id: number }>(token, "sendMessage", { chat_id: chatId, text, link_preview_options: { is_disabled: true } });

/** Bot tokens look like 123456789:AA… */
export const isBotToken = (v: string) => /^\d{6,12}:[A-Za-z0-9_-]{30,}$/.test(v.trim());
