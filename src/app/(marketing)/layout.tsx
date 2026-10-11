import { SiteFooter } from "@/components/landing/site-footer";
import { SiteHeader } from "@/components/landing/site-header";
import { isSignedIn } from "@/components/landing/sections";
import { getLocale } from "@/lib/i18n/server";
import { landingDictionaries } from "@/lib/i18n/landing";

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = landingDictionaries[await getLocale()];
  const signedIn = await isSignedIn();
  return (
    <>
      <SiteHeader t={t.nav} signedIn={signedIn} />
      <main className="overflow-x-clip">{children}</main>
      <SiteFooter t={t} />
    </>
  );
}
