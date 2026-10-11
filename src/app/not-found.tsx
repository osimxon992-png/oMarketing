import Link from "next/link";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getDict } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getDict();
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <Card className="max-w-sm p-8 text-center">
        <p className="text-5xl font-bold text-fg">404</p>
        <p className="mt-2 text-muted">{t.errors.notFound}</p>
        <Link href="/" className={buttonClass("primary", "md", "mt-6")}>
          {t.common.back}
        </Link>
      </Card>
    </main>
  );
}
