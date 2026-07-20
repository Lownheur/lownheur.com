import { describe, expect, it } from "vitest";
import { serializeResource } from "./serialization";

const base = { id: "id", user_id: "private-user", created_at: "2026-01-01T00:00:00Z", updated_at: "2026-01-01T00:00:00Z" };

describe("serializeResource", () => {
  it("does not expose ownership internals", () => {
    const value = serializeResource("categories", { ...base, title: "Sport", description: null, image_path: null });
    expect(value).not.toHaveProperty("user_id");
    expect(value).toMatchObject({ id: "id", title: "Sport" });
  });
  it("normalizes schedule targets", () => {
    const value = serializeResource("schedules", { ...base, event_id: null, goal_id: "goal", starts_at: "2026-01-02T00:00:00Z", ends_at: null, status: "scheduled", recurrence: "weekly", recurrence_interval: 1, recurrence_weekdays: [1, 3], recurrence_ends_at: null, recurrence_timezone: "Europe/Paris" });
    expect(value).toMatchObject({ targetType: "goal", targetId: "goal", recurrence: "weekly", recurrenceWeekdays: [1, 3] });
  });
  it("serializes category parents and goal metrics", () => {
    expect(serializeResource("categories", { ...base, parent_id: "parent", title: "Musculation", description: null, image_path: null })).toMatchObject({ parentCategoryId: "parent" });
    expect(serializeResource("goals", { ...base, category_id: "sport", title: "Sessions", description: null, status: "todo", goal_type: "frequency", target_value: 4, unit: "sessions", period: "week" })).toMatchObject({ goalType: "frequency", targetValue: 4, period: "week" });
  });
});
