import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { randomToken, sha256 } from "@/lib/crypto";

export const SESSION_COOKIE = "sotuv_session";
export const SHOP_COOKIE = "sotuv_shop";
const SESSION_DAYS = 30;

export async function createSession(userId: string): Promise<void> {
  const token = randomToken(32);
  const h = await headers();
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);
  await db.session.create({
    data: {
      id: sha256(token),
      userId,
      expiresAt,
      userAgent: h.get("user-agent")?.slice(0, 300) ?? null,
      ip: clientIp(h),
    },
  });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { id: sha256(token) } });
  jar.delete(SESSION_COOKIE);
  jar.delete(SHOP_COOKIE);
}

export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { id: sha256(token) }, include: { user: true } });
  if (!session || session.expiresAt < new Date()) return null;
  return session.user;
});

export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** The shop the current user is working in (owner-scoped). Null if they have none yet. */
export const getCurrentShop = cache(async () => {
  const user = await getCurrentUser();
  if (!user) return null;
  const jar = await cookies();
  const preferred = jar.get(SHOP_COOKIE)?.value;
  const shops = await db.shop.findMany({
    where: { ownerId: user.id },
    include: { plan: true },
    orderBy: { createdAt: "asc" },
  });
  return shops.find((s) => s.id === preferred) ?? shops[0] ?? null;
});

/** For dashboard pages: user must be logged in and own a shop. */
export async function requireShop() {
  const user = await requireUser();
  const shop = await getCurrentShop();
  if (!shop) redirect("/onboarding");
  return { user, shop };
}

export function clientIp(h: Headers): string {
  return (h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown").slice(0, 64);
}
