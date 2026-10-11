import { z } from "zod";

// Asia/Tashkent is UTC+5 all year (no DST), so day boundaries are a fixed offset.
const OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

export const PERIODS = [
  "today",
  "yesterday",
  "last_7_days",
  "last_30_days",
  "this_week",
  "this_month",
  "last_month",
  "all_time",
  "custom",
] as const;

export const periodSchema = z.object({
  period: z
    .enum(PERIODS)
    .describe(
      "Time range in Asia/Tashkent time. last_7_days / last_30_days include today. this_week starts on Monday. Use custom with from/to for any other range.",
    ),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Only for period=custom: first day, YYYY-MM-DD (inclusive)."),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe("Only for period=custom: last day, YYYY-MM-DD (inclusive). Defaults to `from`."),
});

export type PeriodInput = z.infer<typeof periodSchema>;
export type Range = { from: Date; to: Date; label: string };

/** Start of the Tashkent calendar day containing `d`, as a UTC instant. */
export function tashkentDayStart(d: Date): Date {
  const local = new Date(d.getTime() + OFFSET_MS);
  local.setUTCHours(0, 0, 0, 0);
  return new Date(local.getTime() - OFFSET_MS);
}

/** YYYY-MM-DD of the Tashkent calendar day containing `d`. */
export function tashkentDate(d: Date): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 10);
}

/** "YYYY-MM-DD HH:mm" in Tashkent local time. */
export function tashkentDateTime(d: Date): string {
  return new Date(d.getTime() + OFFSET_MS).toISOString().slice(0, 16).replace("T", " ");
}

function fromDateString(s: string): Date {
  return new Date(Date.parse(`${s}T00:00:00Z`) - OFFSET_MS);
}

/** Converts a period into a half-open [from, to) UTC range. */
export function resolvePeriod(input: PeriodInput, now = new Date()): Range {
  const today = tashkentDayStart(now);
  const tomorrow = new Date(today.getTime() + DAY_MS);
  const local = new Date(today.getTime() + OFFSET_MS);
  const monthStart = fromDateString(`${local.toISOString().slice(0, 7)}-01`);

  const range = (from: Date, to: Date) => ({
    from,
    to,
    label: `${tashkentDate(from)} — ${tashkentDate(new Date(to.getTime() - 1))}`,
  });

  switch (input.period) {
    case "today":
      return range(today, tomorrow);
    case "yesterday":
      return range(new Date(today.getTime() - DAY_MS), today);
    case "last_7_days":
      return range(new Date(today.getTime() - 6 * DAY_MS), tomorrow);
    case "last_30_days":
      return range(new Date(today.getTime() - 29 * DAY_MS), tomorrow);
    case "this_week": {
      const weekday = (local.getUTCDay() + 6) % 7; // Monday = 0
      return range(new Date(today.getTime() - weekday * DAY_MS), tomorrow);
    }
    case "this_month":
      return range(monthStart, tomorrow);
    case "last_month": {
      const prev = new Date(monthStart.getTime() + OFFSET_MS - DAY_MS);
      return range(fromDateString(`${prev.toISOString().slice(0, 7)}-01`), monthStart);
    }
    case "all_time":
      return { from: new Date(0), to: tomorrow, label: "all time" };
    case "custom": {
      if (!input.from) throw new Error("period=custom needs `from` (YYYY-MM-DD)");
      const from = fromDateString(input.from);
      const to = new Date(fromDateString(input.to ?? input.from).getTime() + DAY_MS);
      if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to <= from) {
        throw new Error("Invalid custom range: `to` must be on or after `from`");
      }
      return range(from, to);
    }
  }
}
