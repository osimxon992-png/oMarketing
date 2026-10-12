import { PageHeader } from "@/components/ui/card";
import { requireShop } from "@/lib/auth/session";
import { features } from "@/lib/env";
import { getDict } from "@/lib/i18n/server";
import { pagesDictionaries } from "@/lib/i18n/pages";
import { SettingsForms } from "./settings-forms";

export const metadata = { title: "Sozlamalar" };

export default async function SettingsPage() {
  const { user, shop } = await requireShop();
  const { locale } = await getDict();
  const p = pagesDictionaries[locale].settings;
  return (
    <>
      <PageHeader title={p.title} description={p.subtitle} />
      <SettingsForms
        shopName={shop.name} userName={user.name} email={user.email} hasPassword={Boolean(user.passwordHash)}
        notifyConnected={user.notifyChatId !== null}
        botConfigured={features().platformBot}
      />
    </>
  );
}
