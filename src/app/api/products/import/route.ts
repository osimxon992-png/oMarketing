import { z } from "zod";
import { handler, parseJson, requireApiShop } from "@/lib/api";
import { db } from "@/lib/db";
import { buildImportPlan, mappingSchema, MAX_IMPORT_ROWS } from "@/lib/import";
import { buildSearchText } from "@/lib/products";

const schema = z.object({
  mapping: mappingSchema,
  rows: z.array(z.record(z.string(), z.string().max(10_000))).max(MAX_IMPORT_ROWS),
  dryRun: z.boolean().default(true),
});

/** Step 2: validate (dryRun) or commit the import. */
export const POST = handler(async (req: Request) => {
  const { shop } = await requireApiShop();
  const { mapping, rows, dryRun } = await parseJson(req, schema);
  const plan = buildImportPlan(rows, mapping);

  if (dryRun || plan.products.length === 0) {
    return Response.json({
      dryRun: true,
      rowCount: plan.rowCount,
      productCount: plan.products.length,
      variantCount: plan.products.reduce((s, p) => s + p.variants.length, 0),
      errors: plan.errors.slice(0, 200),
      errorCount: plan.errors.length,
      preview: plan.products.slice(0, 20).map((p) => ({
        name: p.name,
        price: p.price,
        category: p.category,
        stock: p.variants.length ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock,
        variants: p.variants.length,
        photos: p.photoUrls.length,
      })),
    });
  }

  let created = 0;
  // Chunked transactions keep each one short for large files.
  for (let i = 0; i < plan.products.length; i += 100) {
    const chunk = plan.products.slice(i, i + 100);
    await db.$transaction(
      chunk.map((p) =>
        db.product.create({
          data: {
            shopId: shop.id,
            name: p.name,
            description: p.description,
            price: p.price,
            category: p.category,
            sku: p.sku ?? null,
            stock: p.variants.length ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock,
            active: p.active,
            searchText: buildSearchText(p),
            variants: { create: p.variants.map((v) => ({ size: v.size, color: v.color, price: v.price ?? null, stock: v.stock, sku: v.sku ?? null })) },
            images: { create: p.photoUrls.map((url, position) => ({ shopId: shop.id, url, position })) },
          },
        }),
      ),
    );
    created += chunk.length;
  }
  return Response.json({ dryRun: false, created, errorCount: plan.errors.length });
});
