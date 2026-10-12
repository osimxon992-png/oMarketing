import { PageHeader } from "@/components/ui/card";
import { requireShop } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/server";
import { pagesDictionaries } from "@/lib/i18n/pages";
import { BotSettingsForm } from "./settings-form";

export const metadata = { title: "Bot sozlamalari" };

type Zone = { name: string; price: number };
type Faq = { q: string; a: string };

export default async function AiSettingsPage() {
  const { shop } = await requireShop();
  const { locale } = await getDict();
  const p = pagesDictionaries[locale].ai;
  return (
    <>
      <PageHeader title={p.title} description={p.subtitle} />
      <BotSettingsForm
        initial={{
          aiEnabled: shop.aiEnabled,
          greeting: shop.greeting,
          workingHours: shop.workingHours,
          pickupAddress: shop.pickupAddress,
          returnPolicy: shop.returnPolicy,
          deliveryZones: (Array.isArray(shop.deliveryZones) ? shop.deliveryZones : []) as Zone[],
          faq: (Array.isArray(shop.faq) ? shop.faq : []) as Faq[],
        }}
      />
    </>
  );
}
