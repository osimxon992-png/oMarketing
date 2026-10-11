import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { env } from "@/lib/env";
import { AuthForm } from "../auth-form";

export const metadata = { title: "Kirish" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/dashboard");
  return <AuthForm mode="login" telegramBot={env().PLATFORM_BOT_USERNAME ?? null} />;
}
