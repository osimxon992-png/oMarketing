import { ApiError, handler, requireApiShop } from "@/lib/api";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string; imageId: string }> };

export const DELETE = handler(async (_req: Request, { params }: Ctx) => {
  const { shop } = await requireApiShop();
  const { id, imageId } = await params;
  const res = await db.productImage.deleteMany({ where: { id: imageId, productId: id, shopId: shop.id } });
  if (res.count === 0) throw new ApiError(404, "not_found");
  return Response.json({ ok: true });
});
