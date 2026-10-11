import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { requireShop } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n/server";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const { shop } = await requireShop();
  const { t } = await getDict();
  const cats = await db.product.findMany({ where: { shopId: shop.id, category: { not: "" } }, distinct: ["category"], select: { category: true } });
  return (
    <>
      <PageHeader
        title={t.products.newTitle}
        action={
          <Link href="/dashboard/products" className={buttonClass("ghost")}>
            <ArrowLeft className="h-4 w-4" /> {t.common.back}
          </Link>
        }
      />
      <ProductForm
        categories={cats.map((c) => c.category)}
        initial={{ name: "", description: "", price: 0, category: "", sku: null, stock: 0, active: true, variants: [], images: [] }}
      />
    </>
  );
}
