import { CtaBand, Explore, Hero, Industries, isSignedIn, Marquee, Problem, Stats } from "@/components/landing/sections";
import { getLocale } from "@/lib/i18n/server";
import { landingDictionaries } from "@/lib/i18n/landing";

export default async function HomePage() {
  const locale = await getLocale();
  const t = landingDictionaries[locale];
  const signedIn = await isSignedIn();
  return (
    <>
      <Hero t={t} locale={locale} signedIn={signedIn} />
      <Marquee items={t.marquee} />
      <Stats stats={t.stats} />
      <Problem t={t.problem} />
      <Explore t={t.explore} />
      <Industries t={t.industries} index="03" />
      <CtaBand t={t.cta} signedIn={signedIn} dashboardLabel={t.nav.dashboard} />
    </>
  );
}
