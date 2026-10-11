import type { Metadata } from "next";
import { CtaBand, FeatureGrid, Industries, isSignedIn, PageHero, PanelShowcase } from "@/components/landing/sections";
import { getLocale } from "@/lib/i18n/server";
import { landingDictionaries } from "@/lib/i18n/landing";

export async function generateMetadata(): Promise<Metadata> {
  return { title: landingDictionaries[await getLocale()].pages.features.title };
}

export default async function FeaturesPage() {
  const locale = await getLocale();
  const t = landingDictionaries[locale];
  const signedIn = await isSignedIn();
  return (
    <>
      <PageHero eyebrow={t.pages.features.title} title={t.pages.features.heading} subtitle={t.pages.features.subtitle} />
      <FeatureGrid t={t.features} index="01" />
      <PanelShowcase t={t.panel} locale={locale} index="02" />
      <Industries t={t.industries} index="03" />
      <CtaBand t={t.cta} signedIn={signedIn} dashboardLabel={t.nav.dashboard} />
    </>
  );
}
