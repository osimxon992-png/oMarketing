import { z } from "zod";
import { handler, parseJson, requireApiShop } from "@/lib/api";
import { createProduct, listProducts, productInputSchema } from "@/lib/products";

const listSchema = z.object({
  q: z.string().max(200).optional(),
  category: z.string().max(100).optional(),
  status: z.enum(["active", "inactive", "all"]).optional(),
  page: z.coerce.number().int().min(1).max(10_000).optional(),
});

export const GET = handler(async (req: Request) => {
  const { shop } = await requireApiShop();
  const params = listSchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  return Response.json(await listProducts(shop.id, params));
});

export const POST = handler(async (req: Request) => {
  const { shop } = await requireApiShop();
  const input = await parseJson(req, productInputSchema);
  const product = await createProduct(shop.id, input);
  return Response.json({ product }, { status: 201 });
});
