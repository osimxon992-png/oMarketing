import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { env } from "@/lib/env";

/** Referral link: remembers the referrer for 30 days and sends the visitor to sign-up. */
export async function GET(_req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const res = NextResponse.redirect(new URL("/register", env().APP_URL));
  if (/^[A-Za-z0-9_-]{4,32}$/.test(code)) {
    const shop = await db.shop.findUnique({ where: { referralCode: code }, select: { id: true } });
    if (shop) {
      res.cookies.set("sotuv_ref", code, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 86_400,
        path: "/",
      });
    }
  }
  return res;
}
