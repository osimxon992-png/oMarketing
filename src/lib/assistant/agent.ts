import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { betaZodTool } from "@anthropic-ai/sdk/helpers/beta/zod";
import type { Plan, Shop } from "@prisma/client";
import { z } from "zod";
import { env } from "@/lib/env";
import type { Locale } from "@/lib/i18n/config";
import { periodSchema, resolvePeriod, tashkentDate } from "./period";
import * as q from "./queries";

/** Events streamed to the browser as newline-delimited JSON. */
export type AssistantEvent =
  | { type: "text"; text: string }
  | { type: "tool"; name: string }
  | { type: "done" }
  | { type: "error"; code: "refusal" | "failed" };

export type ChatTurn = { role: "user" | "assistant"; content: string };

const SYSTEM_PROMPT = `You are the oMarketing business assistant inside a seller's dashboard. oMarketing is an AI sales assistant for shops that sell through Telegram, Instagram and a website widget in Uzbekistan. The person you talk to is the shop owner. Your job is to answer their questions about their own shop: subscribers, who wrote, conversations, orders, sales, revenue, products, stock, customers, channels and their subscription.

How to work:
- Every number you state must come from a tool result in this conversation. Call the tools before answering; never estimate or invent figures. If the data needed isn't available from any tool, say so plainly.
- "Obunachi" / "подписчик" (subscriber) means a new customer who contacted the shop for the first time (newSubscribers). "Yozganlar" / "написали" means distinct customers who sent at least one message in the period (customersWhoWrote). "Savdo" / "продажи" means orders created in the period that were not cancelled; "tushum" / "выручка" can mean either that sum or payments actually received (paymentsReceived) - when the difference matters, give both and label them.
- All dates and day boundaries are Asia/Tashkent time. Pick the period that matches the question ("bugun" = today, "kecha" = yesterday, "shu hafta" = this_week, "shu oy" = this_month). When the user names no period, use today for "now" questions and this_month otherwise, and say which period you used.
- When the user asks to compare periods, fetch each period and compute the difference and percent change from the fetched numbers.
- Test chats (playground, demo) are already excluded from all statistics.

How to answer:
- Reply in the language the user writes in (Uzbek Latin or Russian).
- Lead with the direct answer, then the supporting detail. Keep it short: a few sentences or a compact list.
- Format money as "1 250 000 so'm" in Uzbek or "1 250 000 сум" in Russian.
- Use plain text with "- " bullets and **bold** for key figures. No tables or headings.
- If a number is zero, say so and, when it helps, suggest the likely reason from the data (for example no channel connected yet).`;

function contextNote(shop: Shop, locale: Locale): string {
  return `Shop: "${shop.name}". Today in Tashkent: ${tashkentDate(new Date())}. Dashboard language: ${locale === "ru" ? "Russian" : "Uzbek"}.`;
}

export function buildTools(shop: Shop & { plan?: Plan | null }) {
  const json = (v: unknown) => JSON.stringify(v);
  const limit = (max: number, def: number) => z.number().int().min(1).max(max).default(def);

  return [
    betaZodTool({
      name: "get_shop_overview",
      description:
        "Shop profile and setup: subscription plan and status, AI replies used this month vs limit, product counts, connected channels, payment providers, all-time customer and order counts, referred shops.",
      inputSchema: z.object({}),
      run: async () => json(await q.shopOverview(shop)),
    }),
    betaZodTool({
      name: "get_stats",
      description:
        "Key numbers for one period: new subscribers (by channel), distinct customers who wrote, new conversations, message counts (customer / AI / seller), orders and their sum, average order value, payments received, orders by status, conversion rate. Call once per period; call several times to compare periods.",
      inputSchema: periodSchema,
      run: async (input) => json(await q.periodStats(shop.id, resolvePeriod(input))),
    }),
    betaZodTool({
      name: "get_daily_breakdown",
      description:
        "Per-day new subscribers, customer messages, orders and sales sum across a period (max ~90 days). Use for trends and questions like 'which day sold most'.",
      inputSchema: periodSchema,
      run: async (input) => json(await q.dailyBreakdown(shop.id, resolvePeriod(input))),
    }),
    betaZodTool({
      name: "list_orders",
      description: "Orders in a period, newest first, with customer, phone, items, total, status and payment.",
      inputSchema: periodSchema.extend({
        status: z.enum(["NEW", "CONFIRMED", "PAID", "SHIPPED", "DELIVERED", "CANCELLED"]).optional(),
        limit: limit(50, 10),
      }),
      run: async ({ status, limit: n, ...p }) => json(await q.listOrders(shop.id, resolvePeriod(p), status, n)),
    }),
    betaZodTool({
      name: "get_top_products",
      description: "Best-selling products in a period by revenue, with units sold.",
      inputSchema: periodSchema.extend({ limit: limit(30, 10) }),
      run: async ({ limit: n, ...p }) => json(await q.topProducts(shop.id, resolvePeriod(p), n)),
    }),
    betaZodTool({
      name: "get_inventory",
      description:
        "Catalog and stock: product counts, out-of-stock count, and products with price and stock per variant. Optionally search by name or keep only items with stock below a threshold.",
      inputSchema: z.object({
        query: z.string().max(100).optional().describe("Search words, e.g. 'qora palto'."),
        lowStockBelow: z.number().int().min(1).max(100000).optional().describe("Only products whose total stock is below this."),
        limit: limit(50, 15),
      }),
      run: async ({ query, lowStockBelow, limit: n }) => json(await q.inventory(shop.id, query, lowStockBelow, n)),
    }),
    betaZodTool({
      name: "list_conversations",
      description: "Customer conversations active in a period, newest first, with last message, unread count and order count.",
      inputSchema: periodSchema.extend({ unreadOnly: z.boolean().default(false), limit: limit(50, 10) }),
      run: async ({ unreadOnly, limit: n, ...p }) => json(await q.listConversations(shop.id, resolvePeriod(p), unreadOnly, n)),
    }),
    betaZodTool({
      name: "find_customers",
      description: "Look up customers by name, @username or phone, with their orders and total spent.",
      inputSchema: z.object({ query: z.string().min(2).max(100), limit: limit(20, 5) }),
      run: async ({ query, limit: n }) => json(await q.findCustomers(shop.id, query, n)),
    }),
  ].map((tool) => ({ ...tool, eager_input_streaming: true }));
}

class TruncatedToolInput extends Error {}

/**
 * Answers one question about the shop, streaming events through `emit`.
 * `history` holds earlier turns as plain text, the newest user turn last.
 */
export async function runAssistant(
  shop: Shop & { plan?: Plan | null },
  locale: Locale,
  history: ChatTurn[],
  emit: (e: AssistantEvent) => void,
): Promise<void> {
  const e = env();
  const client = new Anthropic({ apiKey: e.ANTHROPIC_API_KEY });

  let runner = client.beta.messages.toolRunner({
    model: e.AI_ASSISTANT_MODEL,
    max_tokens: 16000,
    output_config: { effort: "medium" },
    // On a policy decline the API re-runs the request on a fallback model it picks.
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      { type: "text", text: contextNote(shop, locale) },
    ],
    tools: buildTools(shop),
    messages: history.map((t) => ({ role: t.role, content: t.content })),
    max_iterations: 12,
    stream: true,
  });

  for (let attempt = 0; ; attempt++) {
    try {
      for await (const messageStream of runner) {
        for await (const event of messageStream) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            emit({ type: "text", text: event.delta.text });
          } else if (event.type === "content_block_start" && event.content_block.type === "tool_use") {
            emit({ type: "tool", name: event.content_block.name });
          }
        }
        const message = await messageStream.finalMessage();
        attempt = 0;
        if (message.stop_reason === "refusal") {
          emit({ type: "error", code: "refusal" });
          return;
        }
        if (message.stop_reason === "max_tokens" && message.content.some((b) => b.type === "tool_use")) {
          throw new TruncatedToolInput("tool input truncated");
        }
      }
      emit({ type: "done" });
      return;
    } catch (err) {
      // Only an unparseable streamed tool input is worth re-issuing; the
      // runner's params already hold the conversation up to that turn.
      if (err instanceof Anthropic.APIError || err instanceof TruncatedToolInput || attempt >= 2) throw err;
      runner = client.beta.messages.toolRunner({ ...runner.params });
    }
  }
}
