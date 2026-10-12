import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "@/lib/crypto";
import { env } from "@/lib/env";

/**
 * Instagram API with Instagram Login (Business Login for Instagram).
 * Docs: developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login
 */
export const IG_SCOPES = ["instagram_business_basic", "instagram_business_manage_messages"];

export class InstagramApiError extends Error {
  constructor(public step: string, message: string) {
    super(`Instagram ${step}: ${message}`);
  }
}

const graph = () => `https://graph.instagram.com/${env().META_GRAPH_VERSION}`;
export const redirectUri = () => `${env().APP_URL}/api/instagram/callback`;

async function json<T>(res: Response, step: string): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } | string; error_message?: string };
  if (!res.ok) {
    const e = data.error;
    throw new InstagramApiError(step, (typeof e === "string" ? e : e?.message) ?? data.error_message ?? `HTTP ${res.status}`);
  }
  return data;
}

export function authorizeUrl(state: string): string {
  const q = new URLSearchParams({
    client_id: env().INSTAGRAM_APP_ID ?? "",
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: IG_SCOPES.join(","),
    state,
  });
  return `https://www.instagram.com/oauth/authorize?${q}`;
}

/** Code → short-lived token → long-lived (≈60 days) token. */
export async function exchangeCode(code: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const e = env();
  const form = new URLSearchParams({
    client_id: e.INSTAGRAM_APP_ID ?? "",
    client_secret: e.INSTAGRAM_APP_SECRET ?? "",
    grant_type: "authorization_code",
    redirect_uri: redirectUri(),
    code: code.replace(/#_$/, ""),
  });
  const short = await json<{ data?: { access_token: string }[]; access_token?: string }>(
    await fetch("https://api.instagram.com/oauth/access_token", { method: "POST", body: form, signal: AbortSignal.timeout(15_000) }),
    "token",
  );
  const shortToken = short.data?.[0]?.access_token ?? short.access_token;
  if (!shortToken) throw new InstagramApiError("token", "no access_token in response");
  const q = new URLSearchParams({ grant_type: "ig_exchange_token", client_secret: e.INSTAGRAM_APP_SECRET ?? "", access_token: shortToken });
  const long = await json<{ access_token: string; expires_in: number }>(
    await fetch(`https://graph.instagram.com/access_token?${q}`, { signal: AbortSignal.timeout(15_000) }),
    "long_lived_token",
  );
  return { accessToken: long.access_token, expiresAt: new Date(Date.now() + long.expires_in * 1000) };
}

export async function refreshToken(token: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const q = new URLSearchParams({ grant_type: "ig_refresh_token", access_token: token });
  const r = await json<{ access_token: string; expires_in: number }>(
    await fetch(`https://graph.instagram.com/refresh_access_token?${q}`, { signal: AbortSignal.timeout(15_000) }),
    "refresh",
  );
  return { accessToken: r.access_token, expiresAt: new Date(Date.now() + r.expires_in * 1000) };
}

/** The professional account behind the token. `user_id` is the ID webhooks use as `entry.id`. */
export async function getProfile(token: string) {
  const q = new URLSearchParams({ fields: "user_id,username,name", access_token: token });
  return json<{ user_id: string; username?: string; name?: string; id: string }>(await fetch(`${graph()}/me?${q}`, { signal: AbortSignal.timeout(15_000) }), "profile");
}

export async function subscribeWebhooks(igId: string, token: string) {
  const q = new URLSearchParams({ subscribed_fields: "messages", access_token: token });
  return json<{ success: boolean }>(await fetch(`${graph()}/${igId}/subscribed_apps?${q}`, { method: "POST", signal: AbortSignal.timeout(15_000) }), "subscribe");
}

/** Best effort: name/username of the person who wrote (IGSID). */
export async function getSender(igsid: string, token: string): Promise<{ name?: string; username?: string }> {
  try {
    const q = new URLSearchParams({ fields: "name,username", access_token: token });
    return await json(await fetch(`${graph()}/${igsid}?${q}`, { signal: AbortSignal.timeout(10_000) }), "sender");
  } catch {
    return {};
  }
}

/** Sends text, split into chunks under Instagram's 1000-byte limit. */
export async function sendMessage(igId: string, token: string, recipientId: string, text: string) {
  for (const chunk of splitBytes(text, 950)) {
    await json(
      await fetch(`${graph()}/${igId}/messages`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: { id: recipientId }, message: { text: chunk } }),
        signal: AbortSignal.timeout(15_000),
      }),
      "send",
    );
  }
}

function splitBytes(text: string, max: number): string[] {
  const out: string[] = [];
  let cur = "";
  for (const line of text.split("\n")) {
    const next = cur ? `${cur}\n${line}` : line;
    if (Buffer.byteLength(next) <= max) cur = next;
    else {
      if (cur) out.push(cur);
      cur = line;
      while (Buffer.byteLength(cur) > max) {
        let cut = cur.length;
        while (Buffer.byteLength(cur.slice(0, cut)) > max) cut--;
        out.push(cur.slice(0, cut));
        cur = cur.slice(cut);
      }
    }
  }
  if (cur) out.push(cur);
  return out;
}

/** Verifies Meta's X-Hub-Signature-256 header (HMAC-SHA256 of the raw body with the app secret). */
export function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = env().INSTAGRAM_APP_SECRET;
  if (!secret || !header?.startsWith("sha256=")) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(header.slice(7), expected);
}
