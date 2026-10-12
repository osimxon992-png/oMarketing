import { ApiError, handler, requireApiAdmin } from "@/lib/api";
import { markInvoicePaid } from "@/lib/billing";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

/** Confirms a subscription payment received outside the automatic callbacks. */
export const POST = handler(async (_req: Request, { params }: Ctx) => {
  await requireApiAdmin();
  const { id } = await params;
  if (!(await db.billingInvoice.findUnique({ where: { id }, select: { id: true } }))) throw new ApiError(404, "not_found");
  await markInvoicePaid(id, "manual");
  return Response.json({ ok: true });
});
