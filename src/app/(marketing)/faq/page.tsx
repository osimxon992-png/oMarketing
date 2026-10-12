import type { Metadata } from "next";
import { CtaBand, FaqList, isSignedIn, PageHero } from "@/components/landing/sections";
import { getLocale } from "@/lib/i18n/server";
import { landingDictionaries } from "@/lib/i18n/landing";

export async function generateMetadata(): Promise<Metadata> {
  return { title: landingDictionaries[await getLocale()].pages.faq.title };
}

export default async function FaqPage() {
  const locale = await getLocale();
  const t = landingDictionaries[locale];
  const signedIn = await isSignedIn();
  return (
    <>
      <PageHero eyebrow={t.pages.faq.title} title={t.pages.faq.heading} subtitle={t.pages.faq.subtitle} homeLabel={t.nav.home} />
      <FaqList items={t.faq.items} />
      <CtaBand t={t.cta} signedIn={signedIn} dashboardLabel={t.nav.dashboard} />
    </>
  );
}
