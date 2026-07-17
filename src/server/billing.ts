import Stripe from "stripe";
import { getStripeEnv } from "@/lib/env";
import type { PlanId } from "@/lib/plans";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type BillingStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "cancelled"
  | "incomplete";

let stripeClient: Stripe | undefined;

export function getStripe() {
  if (!stripeClient) {
    stripeClient = new Stripe(getStripeEnv().secretKey, {
      appInfo: { name: "Lownheur", version: "1.0.0" }
    });
  }
  return stripeClient;
}

export function planFromPriceId(
  priceId: string | null | undefined
): PlanId | null {
  if (!priceId) return null;
  const { priceIds } = getStripeEnv();
  if (priceId === priceIds.pro) return "pro";
  if (priceId === priceIds.max) return "max";
  return null;
}

export function billingStatusFromStripe(
  status: Stripe.Subscription.Status
): BillingStatus {
  if (status === "active" || status === "trialing" || status === "past_due") {
    return status;
  }
  if (status === "canceled") return "cancelled";
  return "incomplete";
}

export function hasPaidEntitlement(status: BillingStatus) {
  return status === "active" || status === "trialing";
}

function stripeId(value: string | { id: string }) {
  return typeof value === "string" ? value : value.id;
}

function subscriptionPeriod(subscription: Stripe.Subscription) {
  const items = subscription.items.data;
  if (!items.length) return { start: null, end: null };
  return {
    start: new Date(
      Math.min(...items.map((item) => item.current_period_start)) * 1000
    ).toISOString(),
    end: new Date(
      Math.max(...items.map((item) => item.current_period_end)) * 1000
    ).toISOString()
  };
}

async function resolveUserId(
  subscription: Stripe.Subscription,
  hintedUserId?: string
) {
  if (hintedUserId) return hintedUserId;
  if (subscription.metadata.user_id) return subscription.metadata.user_id;
  const admin = createSupabaseAdminClient();
  const customerId = stripeId(subscription.customer);
  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .or(
      `stripe_subscription_id.eq.${subscription.id},stripe_customer_id.eq.${customerId}`
    )
    .maybeSingle();
  return data?.user_id ?? null;
}

export async function syncStripeSubscription(
  subscription: Stripe.Subscription,
  hintedUserId?: string
) {
  const userId = await resolveUserId(subscription, hintedUserId);
  if (!userId) return false;
  const incomingPlan = planFromPriceId(subscription.items.data[0]?.price.id);
  const status = billingStatusFromStripe(subscription.status);
  const period = subscriptionPeriod(subscription);
  const admin = createSupabaseAdminClient();
  const { data: existing } = await admin
    .from("subscriptions")
    .select("plan")
    .eq("user_id", userId)
    .maybeSingle();
  const plan =
    incomingPlan ?? (existing?.plan as PlanId | undefined) ?? "free";
  const { error } = await admin.from("subscriptions").upsert(
    {
      user_id: userId,
      plan,
      status,
      stripe_customer_id: stripeId(subscription.customer),
      stripe_subscription_id: subscription.id,
      current_period_start: period.start,
      current_period_end: period.end,
      cancel_at_period_end: subscription.cancel_at_period_end
    },
    { onConflict: "user_id" }
  );
  if (error) throw error;
  return true;
}

export async function cancelStripeSubscriptionForUser(userId: string) {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("subscriptions")
    .select("stripe_subscription_id,status")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data?.stripe_subscription_id || data.status === "cancelled") return;
  await getStripe().subscriptions.cancel(data.stripe_subscription_id);
}