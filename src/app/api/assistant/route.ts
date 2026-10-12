import { z } from "zod";
import { handler, parseJson, requireApiShop } from "@/lib/api";
import { answerQuestion } from "@/lib/assistant/answer";
import { getLocale } from "@/lib/i18n/server";
import { rateLimit, tooManyRequests } from "@/lib/rate-limit";

const schema = z.object({
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(40)
    .refine((m) => m[m.length - 1]?.role === "user", "Conversation must end with a user turn"),
});

/** Answers the latest question. Responds as newline-delimited JSON events, like a stream. */
export const POST = handler(async (req: Request) => {
  const { user, shop } = await requireApiShop();
  const limit = await rateLimit(`assistant:${user.id}`, 60, 600);
  if (!limit.ok) return tooManyRequests(limit);

  const { messages } = await parseJson(req, schema);
  const question = messages[messages.length - 1]!.content;
  let body: string;
  try {
    const text = await answerQuestion(shop, question, await getLocale());
    body = `${JSON.stringify({ type: "text", text })}\n${JSON.stringify({ type: "done" })}\n`;
  } catch (err) {
    console.error("[assistant] failed:", err instanceof Error ? err.message : err);
    body = `${JSON.stringify({ type: "error", code: "failed" })}\n`;
  }
  return new Response(body, { headers: { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" } });
});
