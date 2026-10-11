import { z } from "zod";
import { ApiError, handler, parseJson, requireApiShop } from "@/lib/api";
import { runAssistant, type AssistantEvent } from "@/lib/assistant/agent";
import { features } from "@/lib/env";
import { getLocale } from "@/lib/i18n/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

export const maxDuration = 120;

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(40)
    .refine((m) => m[0]?.role === "user" && m[m.length - 1]?.role === "user", "Conversation must start and end with a user turn"),
});

export const POST = handler(async (req: Request) => {
  const { user, shop } = await requireApiShop();
  if (!features().ai) throw new ApiError(503, "ai_not_configured");

  const limit = await rateLimit(`assistant:${user.id}`, 30, 600);
  if (!limit.ok) return tooManyRequests(limit);

  const { messages } = await parseJson(req, schema);
  const locale = await getLocale();
  const encoder = new TextEncoder();

  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (e: AssistantEvent) => controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
      try {
        await runAssistant(shop, locale, messages, emit);
      } catch (err) {
        console.error("[assistant] failed:", err instanceof Error ? err.message : err);
        emit({ type: "error", code: "failed" });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(body, {
    headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" },
  });
});
