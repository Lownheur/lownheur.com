import { afterEach, describe, expect, it } from "vitest";
import {
  billingStatusFromStripe,
  hasPaidEntitlement,
  planFromPriceId
} from "./billing";

describe("billing rules", () => {
  afterEach(() => {
    delete process.env.STRIPE_PRO_PRICE_ID;
    delete process.env.STRIPE_MAX_PRICE_ID;
    delete process.env.STRIPE_SECRET_KEY;
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it("maps only configured recurring prices to plans", () => {
    process.env.STRIPE_PRO_PRICE_ID = "price_pro";
    process.env.STRIPE_MAX_PRICE_ID = "price_max";
    process.env.STRIPE_SECRET_KEY = "sk_test_value";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_value";
    expect(planFromPriceId("price_pro")).toBe("pro");
    expect(planFromPriceId("price_max")).toBe("max");
    expect(planFromPriceId("price_unknown")).toBeNull();
  });

  it("grants paid quotas only to active or trialing subscriptions", () => {
    expect(hasPaidEntitlement(billingStatusFromStripe("active"))).toBe(true);
    expect(hasPaidEntitlement(billingStatusFromStripe("trialing"))).toBe(true);
    expect(hasPaidEntitlement(billingStatusFromStripe("past_due"))).toBe(false);
    expect(hasPaidEntitlement(billingStatusFromStripe("unpaid"))).toBe(false);
    expect(hasPaidEntitlement(billingStatusFromStripe("canceled"))).toBe(false);
  });
});