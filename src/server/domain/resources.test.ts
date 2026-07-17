import { describe, expect, it } from "vitest";
import {
  DomainError,
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
});
