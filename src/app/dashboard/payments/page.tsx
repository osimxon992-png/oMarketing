import { PageHeader } from "@/components/ui/card";
import { requireShop } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n/server";
import { pagesDictionaries } from "@/lib/i18n/pages";
import { PaymentsForm } from "./payments-form";

export const metadata = { title: "To'lovlar" };

export default async function PaymentsPage() {
  const { shop } = await requireShop();
  const { locale } = await getDict();
  const p = pagesDictionaries[locale].payments;
  const c = await db.shopPaymentConfig.findUnique({ where: { shopId: shop.id } });
  return (
    <>
      <PageHeader title={p.title} description={p.subtitle} />
      <PaymentsForm
        initial={{
          paymeEnabled: c?.paymeEnabled ?? false,
          paymeMerchantId: c?.paymeMerchantId ?? "",
          paymeTestMode: c?.paymeTestMode ?? true,
          paymeKeySet: Boolean(c?.paymeKeyEnc),
          clickEnabled: c?.clickEnabled ?? false,
          clickServiceId: c?.clickServiceId ?? "",
          clickMerchantId: c?.clickMerchantId ?? "",
          clickKeySet: Boolean(c?.clickSecretKeyEnc),
        }}
      />
    </>
  );
}
