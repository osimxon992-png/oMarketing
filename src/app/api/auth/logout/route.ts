import { destroySession } from "@/lib/auth/session";
import { handler } from "@/lib/api";

export const POST = handler(async () => {
  await destroySession();
  return Response.json({ ok: true });
});
