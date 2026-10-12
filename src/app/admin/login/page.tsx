import { redirect } from "next/navigation";
import { Logo } from "@/components/logo";
import { LanguageSwitch } from "@/components/preferences";
import { adminConfigured, isAdmin } from "@/lib/auth/admin";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin", robots: { index: false, follow: false } };

export default async function AdminLoginPage() {
  if (await isAdmin()) redirect("/admin");
  return (
    <div className="flex min-h-screen flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <div className="flex items-center gap-4">
          <Logo href="/admin/login" />
          <span className="rounded-full border border-line px-3 py-1 font-mono text-xs text-muted">ADMIN</span>
        </div>
        <div className="flex items-center gap-1.5">
          <LanguageSwitch />
        </div>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16">
        <AdminLoginForm configured={adminConfigured()} />
      </main>
    </div>
  );
}
