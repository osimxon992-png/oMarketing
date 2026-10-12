import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "@/lib/env";
import { safeEqual, sha256, signValue, verifySignedValue } from "@/lib/crypto";

/**
 * The platform owner's panel. Not tied to user accounts: the only credentials are
 * ADMIN_LOGIN / ADMIN_PASSWORD from env, the session is a signed cookie.
 */
const ADMIN_COOKIE = "sotuv_admin";
const TTL_SECONDS = 12 * 3600;
export const ADMIN_PASSWORD_MIN = 12;

// Changing ADMIN_PASSWORD logs out every open admin session.
const passwordStamp = () => sha256(`${env().AUTH_SECRET}:${env().ADMIN_PASSWORD}`).slice(0, 16);

export function adminConfigured(): boolean {
  const e = env();
  return Boolean(e.ADMIN_LOGIN && e.ADMIN_PASSWORD && e.ADMIN_PASSWORD.length >= ADMIN_PASSWORD_MIN);
}

export function checkAdminCredentials(login: string, password: string): boolean {
  const e = env();
  if (!adminConfigured() || !e.ADMIN_LOGIN || !e.ADMIN_PASSWORD) return false;
  const loginOk = safeEqual(sha256(login), sha256(e.ADMIN_LOGIN));
  const passwordOk = safeEqual(sha256(password), sha256(e.ADMIN_PASSWORD));
  return loginOk && passwordOk;
}

export async function startAdminSession(): Promise<void> {
  (await cookies()).set(ADMIN_COOKIE, signValue({ admin: passwordStamp() }, TTL_SECONDS), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: TTL_SECONDS,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(ADMIN_COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  if (!adminConfigured()) return false;
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const data = token ? verifySignedValue<{ admin?: string }>(token) : null;
  return typeof data?.admin === "string" && safeEqual(data.admin, passwordStamp());
}

/** For admin pages. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
