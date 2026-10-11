import { db } from "@/lib/db";

/** Serves product photos stored in the database. IDs are unguessable cuids. */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-z0-9]{20,40}$/.test(id)) return new Response("Not found", { status: 404 });
  const img = await db.productImage.findUnique({ where: { id }, select: { data: true, url: true, mimeType: true } });
  if (!img) return new Response("Not found", { status: 404 });
  if (!img.data) return img.url ? Response.redirect(img.url, 302) : new Response("Not found", { status: 404 });
  return new Response(new Uint8Array(img.data), {
    headers: {
      "Content-Type": img.mimeType,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "default-src 'none'",
    },
  });
}
