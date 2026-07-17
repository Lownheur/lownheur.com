export const PLAN_LIMITS = {
  free: {
    name: "Free",
    priceEur: 0,
    storageBytes: 100_000_000,
    storageLabel: "0.1 GB",
    mcpCalls: 1_000
  },
  pro: {
    name: "Pro",
    priceEur: 15,
    storageBytes: 10_000_000_000,
    storageLabel: "10 GB",
    mcpCalls: 50_000
  },
  max: {
    name: "Max",
    priceEur: 30,
    storageBytes: 50_000_000_000,
    storageLabel: "50 GB",
    mcpCalls: 250_000
  }
} as const;

export type PlanId = keyof typeof PLAN_LIMITS;

export function isPlanId(value: unknown): value is PlanId {
  return typeof value === "string" && value in PLAN_LIMITS;
}

export function getPlanLimit(plan: PlanId) {
  return PLAN_LIMITS[plan];
}
