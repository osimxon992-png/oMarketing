import { z } from "zod";
import { ApiError, handler, parseJson, requireApiAdmin } from "@/lib/api";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  await requireApiAdmin();
  const { id } = await params;
  const { status } = await parseJson(req, z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) }));
  const res = await db.shop.updateMany({ where: { id }, data: { status } });
  if (res.count === 0) throw new ApiError(404, "not_found");
  return Response.json({ ok: true });
});
