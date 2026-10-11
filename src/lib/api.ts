import "server-only";
import { z } from "zod";
import { getCurrentShop, getCurrentUser } from "@/lib/auth/session";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message?: string,
    public details?: unknown,
  ) {
    super(message ?? code);
  }
}

export function jsonError(status: number, code: string, message?: string, details?: unknown): Response {
  return Response.json({ error: code, message: message ?? code, details }, { status });
}

export async function parseJson<S extends z.ZodType>(req: Request, schema: S): Promise<z.infer<S>> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be JSON");
  }
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(422, "validation_error", "Validation failed", z.flattenError(parsed.error));
  }
  return parsed.data;
}

/** Wraps a route handler: converts thrown ApiErrors into JSON responses and hides internals. */
export function handler<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof ApiError) return jsonError(err.status, err.code, err.message, err.details);
      console.error("[api] unhandled error:", err instanceof Error ? err.message : err);
      return jsonError(500, "internal_error", "Internal server error");
    }
  };
}

export async function requireApiUser() {
  const user = await getCurrentUser();
  if (!user) throw new ApiError(401, "unauthorized");
  return user;
}

/** Current user + the shop they own. All tenant queries must use `shop.id` from here. */
export async function requireApiShop() {
  const user = await requireApiUser();
  const shop = await getCurrentShop();
  if (!shop) throw new ApiError(404, "no_shop", "Create a shop first");
  return { user, shop };
}

export async function requireApiAdmin() {
  const user = await requireApiUser();
  if (user.role !== "ADMIN") throw new ApiError(403, "forbidden");
  return user;
}
