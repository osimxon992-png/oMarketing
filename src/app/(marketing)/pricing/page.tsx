import type { Metadata } from "next";
import { Compare, CtaBand, isSignedIn, loadPlans, PageHero, PricingPlans } from "@/components/landing/sections";
import { getLocale } from "@/lib/i18n/server";
import { landingDictionaries } from "@/lib/i18n/landing";

export async function generateMetadata(): Promise<Metadata> {
  return { title: landingDictionaries[await getLocale()].pages.pricing.title };
}

export default async function PricingPage() {
  const locale = await getLocale();
  const t = landingDictionaries[locale];
  const [plans, signedIn] = await Promise.all([loadPlans(), isSignedIn()]);
  return (
    <>
      <PageHero eyebrow={t.pages.pricing.title} title={t.pages.pricing.heading} subtitle={t.pages.pricing.subtitle} homeLabel={t.nav.home} />
      <PricingPlans t={t.pricing} plans={plans} locale={locale} />
      <Compare t={t.compare} minPrice={Math.min(...plans.map((p) => p.priceUzs))} locale={locale} />
      <CtaBand t={t.cta} signedIn={signedIn} dashboardLabel={t.nav.dashboard} />
    </>
  );
}
