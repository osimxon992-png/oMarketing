import { z } from "zod";
import { ApiError, handler, parseJson, requireApiUser } from "@/lib/api";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import { db } from "@/lib/db";
import { passwordSchema } from "@/lib/validation";

const schema = z.union([
  z.object({ name: z.string().trim().min(1).max(100) }),
  z.object({ currentPassword: z.string().max(200).optional(), newPassword: passwordSchema }),
]);

/** Updates the profile name, or changes the password (current password required when one is set). */
export const PATCH = handler(async (req: Request) => {
  const user = await requireApiUser();
  const input = await parseJson(req, schema);
  if ("name" in input) {
    await db.user.update({ where: { id: user.id }, data: { name: input.name } });
    return Response.json({ ok: true });
  }
  if (user.passwordHash && !(input.currentPassword && (await verifyPassword(user.passwordHash, input.currentPassword)))) {
    throw new ApiError(403, "wrong_password");
  }
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(input.newPassword) } });
  return Response.json({ ok: true });
});
