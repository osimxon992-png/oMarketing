import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/card";
import { buttonClass } from "@/components/ui/button";
import { requireShop } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getDict } from "@/lib/i18n/server";
import { ProductForm } from "../product-form";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { shop } = await requireShop();
  const { t } = await getDict();
  const { id } = await params;
  const [product, cats] = await Promise.all([
    db.product.findFirst({
      where: { id, shopId: shop.id },
      include: { variants: { orderBy: { id: "asc" } }, images: { select: { id: true, url: true }, orderBy: { position: "asc" } } },
    }),
    db.product.findMany({ where: { shopId: shop.id, category: { not: "" } }, distinct: ["category"], select: { category: true } }),
  ]);
  if (!product) notFound();
  return (
    <>
      <PageHeader
        title={t.products.editTitle}
        description={product.name}
        action={
          <Link href="/dashboard/products" className={buttonClass("ghost")}>
            <ArrowLeft className="h-4 w-4" /> {t.common.back}
          </Link>
        }
      />
      <ProductForm
        categories={cats.map((c) => c.category)}
        initial={{
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          category: product.category,
          sku: product.sku,
          stock: product.stock,
          active: product.active,
          variants: product.variants.map((v) => ({ id: v.id, size: v.size, color: v.color, price: v.price, stock: v.stock, sku: v.sku })),
          images: product.images,
        }}
      />
    </>
  );
}
