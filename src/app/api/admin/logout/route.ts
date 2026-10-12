import { handler } from "@/lib/api";
import { endAdminSession } from "@/lib/auth/admin";

export const POST = handler(async () => {
  await endAdminSession();
  return Response.json({ ok: true });
});
