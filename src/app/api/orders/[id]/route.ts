import { z } from "zod";
import { ApiError, handler, parseJson, requireApiShop } from "@/lib/api";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

const schema = z.object({ status: z.enum(["NEW", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]) });

export const PATCH = handler(async (req: Request, { params }: Ctx) => {
  const { shop } = await requireApiShop();
  const { id } = await params;
  const { status } = await parseJson(req, schema);
  const order = await db.order.findFirst({ where: { id, shopId: shop.id }, include: { items: true } });
  if (!order) throw new ApiError(404, "not_found");
  if (order.status === status) return Response.json({ ok: true });

  await db.$transaction(async (tx) => {
    // Only move from the status we read, so concurrent changes can't move stock twice.
    const moved = await tx.order.updateMany({
      where: { id: order.id, status: order.status },
      data: { status, ...(status === "PAID" && !order.paidAt ? { paidAt: new Date() } : {}) },
    });
    if (moved.count === 0) throw new ApiError(409, "conflict", "Order status changed meanwhile");
    // Cancelling gives the reserved stock back.
    if (status === "CANCELLED") {
      for (const item of order.items) {
        if (item.variantId) await tx.productVariant.updateMany({ where: { id: item.variantId }, data: { stock: { increment: item.quantity } } });
        else if (item.productId) await tx.product.updateMany({ where: { id: item.productId, shopId: shop.id }, data: { stock: { increment: item.quantity } } });
      }
    } else if (order.status === "CANCELLED") {
      // Reopening a cancelled order reserves its stock again; the conditional
      // update fails (and rolls everything back) if there isn't enough left.
      for (const item of order.items) {
        const qty = item.quantity;
        const updated = item.variantId
          ? await tx.productVariant.updateMany({ where: { id: item.variantId, stock: { gte: qty } }, data: { stock: { decrement: qty } } })
          : item.productId
            ? await tx.product.updateMany({ where: { id: item.productId, shopId: shop.id, stock: { gte: qty } }, data: { stock: { decrement: qty } } })
            : null;
        if (updated && updated.count === 0) throw new ApiError(409, "insufficient_stock", "Not enough stock to reopen this order");
      }
    }
  });
  return Response.json({ ok: true });
});
