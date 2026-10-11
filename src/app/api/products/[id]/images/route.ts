import { z } from "zod";
import { ApiError, handler, requireApiShop } from "@/lib/api";
import { db } from "@/lib/db";
import { isSafeImageUrl, MAX_IMAGE_BYTES, MAX_IMAGES_PER_PRODUCT, sniffImageType } from "@/lib/images";

type Ctx = { params: Promise<{ id: string }> };

/** Upload a photo (multipart field "file") or attach an HTTPS URL (JSON { url }). */
export const POST = handler(async (req: Request, { params }: Ctx) => {
  const { shop } = await requireApiShop();
  const { id } = await params;
  const product = await db.product.findFirst({ where: { id, shopId: shop.id }, select: { id: true, _count: { select: { images: true } } } });
  if (!product) throw new ApiError(404, "not_found");
  if (product._count.images >= MAX_IMAGES_PER_PRODUCT) throw new ApiError(400, "too_many_images");

  const position = product._count.images;
  const contentType = req.headers.get("content-type") ?? "";

  if (contentType.includes("application/json")) {
    const body = z.object({ url: z.string().url() }).safeParse(await req.json().catch(() => null));
    if (!body.success || !isSafeImageUrl(body.data.url)) throw new ApiError(422, "invalid_url", "Use an https:// image URL");
    const image = await db.productImage.create({
      data: { shopId: shop.id, productId: id, url: body.data.url, position },
      select: { id: true, url: true, position: true },
    });
    return Response.json({ image }, { status: 201 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) throw new ApiError(422, "file_required");
  if (file.size > MAX_IMAGE_BYTES) throw new ApiError(413, "file_too_large", "Max 5 MB");
  const bytes = new Uint8Array(await file.arrayBuffer());
  const mimeType = sniffImageType(bytes);
  if (!mimeType) throw new ApiError(415, "unsupported_image", "JPEG, PNG, WEBP or GIF only");

  const image = await db.productImage.create({
    data: { shopId: shop.id, productId: id, data: Buffer.from(bytes), mimeType, position },
    select: { id: true, url: true, position: true },
  });
  return Response.json({ image }, { status: 201 });
});
