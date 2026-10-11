import { describe, expect, it } from "vitest";
import { resolvePeriod, tashkentDate, tashkentDateTime, tashkentDayStart } from "@/lib/assistant/period";

// 2026-10-11 02:30 in Tashkent (UTC+5) is still 2026-10-10 in UTC.
const now = new Date("2026-10-10T21:30:00Z");
const iso = (d: Date) => d.toISOString();

describe("Tashkent day boundaries", () => {
  it("uses the Tashkent calendar day, not the UTC one", () => {
    expect(tashkentDate(now)).toBe("2026-10-11");
    expect(iso(tashkentDayStart(now))).toBe("2026-10-10T19:00:00.000Z");
    expect(tashkentDateTime(now)).toBe("2026-10-11 02:30");
  });
});

describe("resolvePeriod", () => {
  it("today and yesterday are single Tashkent days", () => {
    const today = resolvePeriod({ period: "today" }, now);
    expect([iso(today.from), iso(today.to)]).toEqual(["2026-10-10T19:00:00.000Z", "2026-10-11T19:00:00.000Z"]);
    const yesterday = resolvePeriod({ period: "yesterday" }, now);
    expect(yesterday.label).toBe("2026-10-10 — 2026-10-10");
  });

  it("rolling windows include today", () => {
    expect(resolvePeriod({ period: "last_7_days" }, now).label).toBe("2026-10-05 — 2026-10-11");
    expect(resolvePeriod({ period: "last_30_days" }, now).label).toBe("2026-09-12 — 2026-10-11");
  });

  it("this_week starts on Monday", () => {
    // 2026-10-11 is a Sunday.
    expect(resolvePeriod({ period: "this_week" }, now).label).toBe("2026-10-05 — 2026-10-11");
  });

  it("calendar months", () => {
    expect(resolvePeriod({ period: "this_month" }, now).label).toBe("2026-10-01 — 2026-10-11");
    expect(resolvePeriod({ period: "last_month" }, now).label).toBe("2026-09-01 — 2026-09-30");
    expect(resolvePeriod({ period: "last_month" }, new Date("2026-01-15T10:00:00Z")).label).toBe("2025-12-01 — 2025-12-31");
  });

  it("custom ranges are inclusive and validated", () => {
    expect(resolvePeriod({ period: "custom", from: "2026-09-01", to: "2026-09-03" }, now).label).toBe("2026-09-01 — 2026-09-03");
    expect(resolvePeriod({ period: "custom", from: "2026-09-01" }, now).label).toBe("2026-09-01 — 2026-09-01");
    expect(() => resolvePeriod({ period: "custom" }, now)).toThrow();
    expect(() => resolvePeriod({ period: "custom", from: "2026-09-05", to: "2026-09-01" }, now)).toThrow();
  });
});
