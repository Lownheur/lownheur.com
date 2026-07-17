import { describe, expect, it } from "vitest";
import { getPlanLimit, isPlanId, PLAN_LIMITS } from "./plans";

describe("plan limits", () => {
  it("keeps every paid plan above the free limits", () => {
    expect(PLAN_LIMITS.pro.mcpCalls).toBeGreaterThan(PLAN_LIMITS.free.mcpCalls);
    expect(PLAN_LIMITS.max.mcpCalls).toBeGreaterThan(PLAN_LIMITS.pro.mcpCalls);
    expect(PLAN_LIMITS.max.storageBytes).toBeGreaterThan(
      PLAN_LIMITS.pro.storageBytes
    );
  });

  it("accepts only known plan identifiers", () => {
    expect(isPlanId("free")).toBe(true);
    expect(isPlanId("enterprise")).toBe(false);
    expect(getPlanLimit("pro").priceEur).toBe(15);
  });
});
