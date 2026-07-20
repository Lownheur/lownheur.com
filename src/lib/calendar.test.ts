import { describe, expect, it } from "vitest";
import {
  addCalendarDays,
  buildCalendarRange,
  dateInTimeZone,
  localMidnightToIso,
  startOfIsoWeek
} from "./calendar";

describe("calendar ranges", () => {
  it("builds ISO weeks starting on Monday", () => {
    expect(startOfIsoWeek("2026-07-20")).toBe("2026-07-20");
    expect(startOfIsoWeek("2026-07-26")).toBe("2026-07-20");
    expect(addCalendarDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("uses the account time zone for local day boundaries", () => {
    expect(localMidnightToIso("2026-07-20", "Europe/Paris")).toBe("2026-07-19T22:00:00.000Z");
    expect(localMidnightToIso("2026-01-20", "Europe/Paris")).toBe("2026-01-19T23:00:00.000Z");
    expect(dateInTimeZone(new Date("2026-07-19T22:00:00.000Z"), "Europe/Paris")).toBe("2026-07-20");
  });

  it("keeps a seven-day week across a daylight-saving transition", () => {
    const range = buildCalendarRange("week", "2026-03-29", "Europe/Paris");
    expect(range.days).toEqual([
      "2026-03-23", "2026-03-24", "2026-03-25", "2026-03-26", "2026-03-27", "2026-03-28", "2026-03-29"
    ]);
    expect(range.from).toBe("2026-03-22T23:00:00.000Z");
    expect(range.to).toBe("2026-03-29T22:00:00.000Z");
  });
});
