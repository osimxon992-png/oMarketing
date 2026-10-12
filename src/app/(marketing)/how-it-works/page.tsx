import type { Metadata } from "next";
import { CtaBand, isSignedIn, PageHero, PanelShowcase, Steps } from "@/components/landing/sections";
import { ChatPreview } from "@/components/landing/chat-preview";
import { getLocale } from "@/lib/i18n/server";
import { landingDictionaries } from "@/lib/i18n/landing";
import { formatUzs } from "@/lib/utils/format";

export async function generateMetadata(): Promise<Metadata> {
  return { title: landingDictionaries[await getLocale()].pages.how.title };
}

export default async function HowItWorksPage() {
  const locale = await getLocale();
  const t = landingDictionaries[locale];
  const signedIn = await isSignedIn();
  return (
    <>
      <PageHero eyebrow={t.pages.how.title} title={t.pages.how.heading} subtitle={t.pages.how.subtitle} homeLabel={t.nav.home} />
      <Steps t={t.how} details={t.stepDetails} />
      <section className="reveal mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <ChatPreview t={t.chat} price={formatUzs(690_000, locale)} total={formatUzs(715_000, locale)} />
      </section>
      <PanelShowcase t={t.panel} locale={locale} />
      <CtaBand t={t.cta} signedIn={signedIn} dashboardLabel={t.nav.dashboard} />
    </>
  );
}
