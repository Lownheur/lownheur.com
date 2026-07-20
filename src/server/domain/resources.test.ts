import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  buildCategoryOptions,
  categoryDescendantIds,
  DomainError,
  getScheduleOccurrencesInRange,
  parseCreateInput,
  parseUpdateInput
} from "./resources";

describe("resource input validation", () => {
  it("normalizes empty descriptions", () => {
    expect(
      parseCreateInput("categories", {
        title: "Sport",
        description: ""
      })
    ).toMatchObject({ title: "Sport", description: null });
  });

  it("requires exactly one schedule target through the public shape", () => {
    expect(() =>
      parseCreateInput("schedules", {
        targetType: "event",
        targetId: "not-a-uuid",
        startsAt: "2026-07-17T10:00:00Z"
      })
    ).toThrow(DomainError);
  });

  it("requires target type and id together on schedule updates", () => {
    expect(() =>
      parseUpdateInput("schedules", { targetType: "goal" })
    ).toThrow("targetType and targetId");
  });

  it("accepts a valid goal status transition payload", () => {
    expect(
      parseUpdateInput("goals", { status: "achieved" })
    ).toEqual({ status: "achieved" });
  });

  it("accepts measurable goals and recurring weekly schedules", () => {
    expect(parseCreateInput("goals", {
      categoryId: "00000000-0000-4000-8000-000000000001",
      title: "Sport",
      goalType: "frequency",
      targetValue: "4",
      unit: "sessions",
      period: "week"
    })).toMatchObject({
      goalType: "frequency",
      targetValue: 4,
      unit: "sessions",
      period: "week"
    });

    expect(parseCreateInput("schedules", {
      targetType: "goal",
      targetId: "00000000-0000-4000-8000-000000000002",
      startsAt: "2026-07-20T18:00:00+02:00",
      recurrence: "weekly",
      recurrenceInterval: 1,
      recurrenceWeekdays: [3, 1, 3],
      recurrenceTimezone: "Europe/Paris"
    })).toMatchObject({
      recurrence: "weekly",
      recurrenceWeekdays: [1, 3],
      recurrenceTimezone: "Europe/Paris"
    });
  });

  it("rejects a weekly schedule without weekdays", () => {
    expect(() => parseCreateInput("schedules", {
      targetType: "event",
      targetId: "00000000-0000-4000-8000-000000000003",
      startsAt: "2026-07-20T18:00:00Z",
      recurrence: "weekly"
    })).toThrow(DomainError);
  });

  it("builds arbitrary-depth category paths and descendants", () => {
    const base = {
      user_id: "user",
      description: null,
      created_at: "2026-07-20T00:00:00Z",
      updated_at: "2026-07-20T00:00:00Z"
    };
    const categories = buildCategoryOptions([
      { ...base, id: "root", title: "Alimentation", parent_id: null },
      { ...base, id: "child", title: "Déjeuner", parent_id: "root" },
      { ...base, id: "grandchild", title: "Dessert", parent_id: "child" }
    ]);

    expect(categories.map((category) => category.path)).toEqual([
      "Alimentation",
      "Alimentation › Déjeuner",
      "Alimentation › Déjeuner › Dessert"
    ]);
    expect(categoryDescendantIds(categories, "root")).toEqual(
      new Set(["root", "child", "grandchild"])
    );
  });

  it("bounds calendar occurrence queries and maps their public shape", async () => {
    const client = {
      rpc: async () => ({
        data: [{
          schedule_id: "00000000-0000-4000-8000-000000000010",
          event_id: "00000000-0000-4000-8000-000000000011",
          goal_id: null,
          occurrence_starts_at: "2026-07-20T08:00:00Z",
          occurrence_ends_at: null,
          recurrence: "weekly",
          recurrence_timezone: "Europe/Paris"
        }],
        error: null
      })
    } as unknown as SupabaseClient;

    await expect(getScheduleOccurrencesInRange(client, {
      from: "2026-07-20T00:00:00Z",
      to: "2026-07-27T00:00:00Z"
    })).resolves.toEqual([expect.objectContaining({
      eventId: "00000000-0000-4000-8000-000000000011",
      recurrence: "weekly"
    })]);
    await expect(getScheduleOccurrencesInRange(client, {
      from: "2026-07-20T00:00:00Z",
      to: "2026-09-20T00:00:00Z"
    })).rejects.toThrow(DomainError);
  });
});
