import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { requireShop } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/server";
import { Importer } from "./importer";

export default async function ImportPage() {
  await requireShop();
  const { t } = await getDict();
  return (
    <>
      <PageHeader
        title={t.importer.title}
        action={
          <Link href="/dashboard/products" className={buttonClass("ghost")}>
            <ArrowLeft className="h-4 w-4" /> {t.common.back}
          </Link>
        }
      />
      <Importer />
    </>
  );
}
