import { z } from "zod";
import { ApiError, handler, parseJson, requireApiShop } from "@/lib/api";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const { shop } = await requireApiShop();
  const { id } = await params;
  const { aiPaused } = await parseJson(req, z.object({ aiPaused: z.boolean() }));
  const res = await db.conversation.updateMany({ where: { id, shopId: shop.id }, data: { aiPaused } });
  if (res.count === 0) throw new ApiError(404, "not_found");
  return Response.json({ ok: true });
});
