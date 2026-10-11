import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Ro'yxatdan o'tish" };

export default async function RegisterPage({ searchParams }: { searchParams: Promise<{ ref?: string }> }) {
  if (await getCurrentUser()) redirect("/dashboard");
  const { ref } = await searchParams;
  // `?ref=CODE` links go through /r/CODE which sets the cookie; support both.
  if (ref && /^[A-Za-z0-9_-]{4,32}$/.test(ref)) redirect(`/r/${ref}`);
  const referred = Boolean((await cookies()).get("sotuv_ref")?.value);
  return <AuthForm mode="register" telegramBot={env().PLATFORM_BOT_USERNAME ?? null} referred={referred} />;
}
