import { z } from "zod";
import { ApiError, handler, parseJson, requireApiShop } from "@/lib/api";
import { db } from "@/lib/db";
import { productInputSchema, updateProduct } from "@/lib/products";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handler(async (_req: Request, { params }: Ctx) => {
  const { shop } = await requireApiShop();
  const { id } = await params;
  const product = await db.product.findFirst({
    where: { id, shopId: shop.id },
    include: { variants: true, images: { select: { id: true, url: true, position: true }, orderBy: { position: "asc" } } },
  });
  if (!product) throw new ApiError(404, "not_found");
  return Response.json({ product });
});

export const PUT = handler(async (req: Request, { params }: Ctx) => {
  const { shop } = await requireApiShop();
  const { id } = await params;
  const input = await parseJson(req, productInputSchema);
  const product = await updateProduct(shop.id, id, input);
  if (!product) throw new ApiError(404, "not_found");
  return Response.json({ product });
});

/** Partial update used by quick toggles in the list (active flag). */
export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const { shop } = await requireApiShop();
  const { id } = await params;
  const { active } = await parseJson(req, z.object({ active: z.boolean() }));
  const res = await db.product.updateMany({ where: { id, shopId: shop.id }, data: { active } });
  if (res.count === 0) throw new ApiError(404, "not_found");
  return Response.json({ ok: true });
});

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const { shop } = await requireApiShop();
  const { id } = await params;
  const res = await db.product.deleteMany({ where: { id, shopId: shop.id } });
  if (res.count === 0) throw new ApiError(404, "not_found");
  return Response.json({ ok: true });
});
