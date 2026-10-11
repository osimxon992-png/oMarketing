import "server-only";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { normalizeSearch } from "@/lib/validation";

export const variantInputSchema = z.object({
  id: z.string().optional(),
  size: z.string().trim().max(40).default(""),
  color: z.string().trim().max(40).default(""),
  price: z.number().int().min(0).max(1_000_000_000).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000),
  sku: z.string().trim().max(64).nullable().optional(),
});

export const productInputSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(5000).default(""),
  price: z.number().int().min(0).max(1_000_000_000),
  category: z.string().trim().max(100).default(""),
  sku: z.string().trim().max(64).nullable().optional(),
  stock: z.number().int().min(0).max(1_000_000).default(0),
  active: z.boolean().default(true),
  variants: z.array(variantInputSchema).max(100).default([]),
});

export type ProductInput = z.infer<typeof productInputSchema>;

export function buildSearchText(p: {
  name: string;
  description: string;
  category: string;
  sku?: string | null;
  variants?: { size: string; color: string }[];
}): string {
  const variantText = (p.variants ?? []).map((v) => `${v.size} ${v.color}`).join(" ");
  return normalizeSearch(`${p.name} ${p.category} ${p.sku ?? ""} ${variantText} ${p.description.slice(0, 1000)}`);
}

/** Total stock: sum of variants when present, otherwise the product-level stock. */
export function totalStock(p: { stock: number; variants: { stock: number }[] }): number {
  return p.variants.length ? p.variants.reduce((s, v) => s + v.stock, 0) : p.stock;
}

export function variantLabel(v: { size: string; color: string }): string {
  return [v.color, v.size].filter(Boolean).join(" / ");
}

export async function createProduct(shopId: string, input: ProductInput) {
  return db.product.create({
    data: {
      shopId,
      name: input.name,
      description: input.description,
      price: input.price,
      category: input.category,
      sku: input.sku ?? null,
      stock: input.variants.length ? input.variants.reduce((s, v) => s + v.stock, 0) : input.stock,
      active: input.active,
      searchText: buildSearchText(input),
      variants: {
        create: input.variants.map((v) => ({ size: v.size, color: v.color, price: v.price ?? null, stock: v.stock, sku: v.sku ?? null })),
      },
    },
    include: { variants: true, images: { select: { id: true, url: true, position: true }, orderBy: { position: "asc" } } },
  });
}

/** Updates a product owned by `shopId`. Variants are synced: missing ones are deleted. */
export async function updateProduct(shopId: string, productId: string, input: ProductInput) {
  return db.$transaction(async (tx) => {
    const existing = await tx.product.findFirst({ where: { id: productId, shopId }, include: { variants: true } });
    if (!existing) return null;
    const keepIds = input.variants.map((v) => v.id).filter((id): id is string => Boolean(id));
    const validIds = new Set(existing.variants.map((v) => v.id));
    await tx.productVariant.deleteMany({ where: { productId, id: { notIn: keepIds.filter((id) => validIds.has(id)) } } });
    for (const v of input.variants) {
      const data = { size: v.size, color: v.color, price: v.price ?? null, stock: v.stock, sku: v.sku ?? null };
      if (v.id && validIds.has(v.id)) await tx.productVariant.update({ where: { id: v.id }, data });
      else await tx.productVariant.create({ data: { ...data, productId } });
    }
    return tx.product.update({
      where: { id: productId },
      data: {
        name: input.name,
        description: input.description,
        price: input.price,
        category: input.category,
        sku: input.sku ?? null,
        stock: input.variants.length ? input.variants.reduce((s, v) => s + v.stock, 0) : input.stock,
        active: input.active,
        searchText: buildSearchText(input),
      },
      include: { variants: true, images: { select: { id: true, url: true, position: true }, orderBy: { position: "asc" } } },
    });
  });
}

export function imageUrl(img: { id: string; url: string | null }, baseUrl = ""): string {
  return img.url ?? `${baseUrl}/api/media/${img.id}`;
}

export type ProductListFilters = { q?: string; category?: string; status?: "active" | "inactive" | "all"; page?: number };

export async function listProducts(shopId: string, f: ProductListFilters, pageSize = 24) {
  const where: Prisma.ProductWhereInput = { shopId };
  if (f.category) where.category = f.category;
  if (f.status === "active") where.active = true;
  if (f.status === "inactive") where.active = false;
  const tokens = f.q ? normalizeSearch(f.q).split(" ").filter(Boolean).slice(0, 6) : [];
  if (tokens.length) where.AND = tokens.map((tok) => ({ searchText: { contains: tok } }));
  const page = Math.max(1, f.page ?? 1);
  const [items, total, categories] = await Promise.all([
    db.product.findMany({
      where,
      include: {
        variants: true,
        images: { select: { id: true, url: true }, orderBy: { position: "asc" }, take: 1 },
      },
      orderBy: { updatedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.product.count({ where }),
    db.product.findMany({ where: { shopId, category: { not: "" } }, distinct: ["category"], select: { category: true }, orderBy: { category: "asc" } }),
  ]);
  return { items, total, page, pageSize, categories: categories.map((c) => c.category) };
}
