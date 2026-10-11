import Link from "next/link";
import { Package, Search, Upload, Plus } from "lucide-react";
import { buttonClass } from "@/components/ui/button";
import { Card, EmptyState, PageHeader } from "@/components/ui/card";
import { requireShop } from "@/lib/auth/session";
import { getDict } from "@/lib/i18n/server";
import { listProducts } from "@/lib/products";
import { ProductRows } from "./product-rows";

export const metadata = { title: "Mahsulotlar" };

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; status?: string; page?: string }>;
}) {
  const { shop } = await requireShop();
  const { t } = await getDict();
  const sp = await searchParams;
  const status = sp.status === "active" || sp.status === "inactive" ? sp.status : "all";
  const page = Math.max(1, Number(sp.page) || 1);
  const data = await listProducts(shop.id, { q: sp.q, category: sp.category || undefined, status, page });
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const filtered = Boolean(sp.q || sp.category || status !== "all");

  const qs = (p: number) => {
    const u = new URLSearchParams();
    if (sp.q) u.set("q", sp.q);
    if (sp.category) u.set("category", sp.category);
    if (status !== "all") u.set("status", status);
    u.set("page", String(p));
    return `?${u}`;
  };

  return (
    <>
      <PageHeader
        title={t.products.title}
        description={t.products.subtitle}
        action={
          <>
            <Link href="/dashboard/products/import" className={buttonClass("secondary")}>
              <Upload className="h-4 w-4" /> {t.products.import}
            </Link>
            <Link href="/dashboard/products/new" className={buttonClass("primary")}>
              <Plus className="h-4 w-4" /> {t.products.add}
            </Link>
          </>
        }
      />

      <Card className="mb-4 p-3">
        <form className="flex flex-col gap-2 sm:flex-row" role="search">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-subtle" />
            <input name="q" defaultValue={sp.q} placeholder={t.products.searchPlaceholder} className="field pl-9" aria-label={t.common.search} />
          </div>
          <select name="category" defaultValue={sp.category ?? ""} className="field sm:w-52" aria-label={t.products.category}>
            <option value="">{t.products.allCategories}</option>
            {data.categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <select name="status" defaultValue={status} className="field sm:w-40" aria-label={t.products.status}>
            <option value="all">{t.products.statusAll}</option>
            <option value="active">{t.common.active}</option>
            <option value="inactive">{t.common.inactive}</option>
          </select>
          <button className={buttonClass("secondary")}>{t.common.search}</button>
        </form>
      </Card>

      {data.items.length === 0 ? (
        <Card>
          <EmptyState
            icon={<Package className="h-7 w-7" />}
            title={filtered ? t.common.noResults : t.products.emptyTitle}
            description={filtered ? undefined : t.products.emptyText}
            action={
              !filtered && (
                <div className="flex flex-wrap justify-center gap-2">
                  <Link href="/dashboard/products/new" className={buttonClass("primary")}>
                    {t.products.add}
                  </Link>
                  <Link href="/dashboard/products/import" className={buttonClass("secondary")}>
                    {t.products.import}
                  </Link>
                </div>
              )
            }
          />
        </Card>
      ) : (
        <>
          <ProductRows
            items={data.items.map((p) => ({
              id: p.id,
              name: p.name,
              category: p.category,
              price: p.price,
              active: p.active,
              stock: p.variants.length ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock,
              variants: p.variants.length,
              image: p.images[0] ? p.images[0].url ?? `/api/media/${p.images[0].id}` : null,
            }))}
          />
          {pages > 1 && (
            <nav className="mt-4 flex items-center justify-center gap-2" aria-label={t.common.page}>
              {page > 1 && (
                <Link href={qs(page - 1)} className={buttonClass("secondary", "sm")}>
                  {t.common.prev}
                </Link>
              )}
              <span className="text-sm text-muted">
                {page} / {pages}
              </span>
              {page < pages && (
                <Link href={qs(page + 1)} className={buttonClass("secondary", "sm")}>
                  {t.common.next}
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </>
  );
}
