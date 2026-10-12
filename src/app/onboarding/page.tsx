import { redirect } from "next/navigation";
import { getCurrentShop, requireUser } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/server";
import { getSetupStatus } from "@/lib/onboarding";
import { Logo } from "@/components/logo";
import { LanguageSwitch } from "@/components/preferences";
import { CreateShopForm, OnboardingSteps } from "./wizard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sozlash" };

export default async function OnboardingPage() {
  await requireUser();
  const shop = await getCurrentShop();
  const { t } = await getDict();
  const status = shop ? await getSetupStatus(shop.id) : null;
  if (status?.live) redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between px-4 py-4 sm:px-8">
        <Logo href={shop ? "/dashboard" : "/"} />
        <div className="flex items-center gap-2">
          <LanguageSwitch />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 pb-16">
        <h1 className="mb-6 text-center text-2xl font-bold text-fg sm:text-3xl">{t.onboarding.title}</h1>
        {!shop || !status ? <CreateShopForm /> : <OnboardingSteps status={status} shopName={shop.name} />}
      </main>
    </div>
  );
}
