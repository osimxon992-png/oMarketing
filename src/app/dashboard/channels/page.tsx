import { PageHeader } from "@/components/ui/card";
import { requireShop } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { env, features } from "@/lib/env";
import { getDict } from "@/lib/i18n/server";
import { pagesDictionaries } from "@/lib/i18n/pages";
import { getEntitlements } from "@/lib/shop";
import { ChannelsView } from "./channels-view";

export const metadata = { title: "Kanallar" };

export default async function ChannelsPage({ searchParams }: { searchParams: Promise<{ ig?: string; detail?: string }> }) {
  const { shop } = await requireShop();
  const { locale } = await getDict();
  const p = pagesDictionaries[locale].channels;
  const [channels, ent, sp] = await Promise.all([
    db.channel.findMany({ where: { shopId: shop.id }, orderBy: { createdAt: "asc" } }),
    getEntitlements(shop),
    searchParams,
  ]);
  return (
    <>
      <PageHeader title={p.title} description={p.subtitle} />
      <ChannelsView
        channels={channels.map((c) => ({
          id: c.id,
          type: c.type,
          status: c.status,
          username: c.username,
          displayName: c.displayName,
          lastError: c.lastError,
          tokenExpiresAt: c.tokenExpiresAt?.toISOString() ?? null,
        }))}
        instagramConfigured={features().instagram}
        instagramAllowed={ent.instagram}
        appUrl={env().APP_URL}
        igResult={sp.ig ?? null}
        igDetail={sp.detail ?? null}
      />
    </>
  );
}
