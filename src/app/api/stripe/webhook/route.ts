import Stripe from "stripe";
import { NextResponse } from "next/server";
import { getStripeEnv, hasStripeEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStripe, syncStripeSubscription } from "@/server/billing";
import { logEvent } from "@/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function objectId(event: Stripe.Event) {
  const object = event.data.object as { id?: string };
  return object.id ?? null;
}

async function claimEvent(event: Stripe.Event) {
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from("stripe_webhook_events").insert({
    event_id: event.id,
    event_type: event.type,
    object_id: objectId(event)
  });
  if (!error) return true;
  if (error.code !== "23505") throw error;

  const { data, error: readError } = await admin
    .from("stripe_webhook_events")
    .select("status,attempts")
    .eq("event_id", event.id)
    .single();
  if (readError) throw readError;
  if (data.status !== "failed") return false;

  const { error: retryError } = await admin
    .from("stripe_webhook_events")
    .update({
      status: "processing",
      attempts: data.attempts + 1,
      last_error: null
    })
    .eq("event_id", event.id)
    .eq("status", "failed");
  if (retryError) throw retryError;
  return true;
}

async function processEvent(event: Stripe.Event) {
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription?.id;
    if (!subscriptionId) return;
    const subscription = await getStripe().subscriptions.retrieve(
      subscriptionId
    );
    await syncStripeSubscription(
      subscription,
      session.client_reference_id ?? session.metadata?.user_id
    );
    return;
  }

  if (
    event.type === "customer.subscription.created" ||
    event.type === "customer.subscription.updated" ||
    event.type === "customer.subscription.deleted"
  ) {
    await syncStripeSubscription(
      event.data.object as Stripe.Subscription
    );
  }
}

export async function POST(request: Request) {
  if (!hasStripeEnv()) {
    return NextResponse.json(
      { error: "Stripe is not configured." },
      { status: 503 }
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Missing Stripe signature." },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(
      await request.text(),
      signature,
      getStripeEnv().webhookSecret
    );
  } catch {
    return NextResponse.json(
      { error: "Invalid Stripe signature." },
      { status: 400 }
    );
  }

  try {
    if (!(await claimEvent(event))) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    await processEvent(event);
    const admin = createSupabaseAdminClient();
    const { error } = await admin
      .from("stripe_webhook_events")
      .update({
        status: "processed",
        processed_at: new Date().toISOString(),
        last_error: null
      })
      .eq("event_id", event.id);
    if (error) throw error;

    logEvent("info", "stripe.webhook_processed", {
      eventId: event.id,
      eventType: event.type
    });
    return NextResponse.json({ received: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message.slice(0, 1000) : "Unknown error";
    try {
      await createSupabaseAdminClient()
        .from("stripe_webhook_events")
        .update({ status: "failed", last_error: message })
        .eq("event_id", event.id);
    } catch {
      // Stripe will retry the non-2xx response.
    }
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 }
    );
  }
}