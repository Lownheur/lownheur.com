import { NextResponse } from "next/server";
import { hasStripeEnv } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import {
  getStripe,
  syncStripeSubscription
} from "@/server/billing";
import { logEvent } from "@/server/logger";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request) {
  const secret = process.env.CRON_SECRET;
  return Boolean(
    secret &&
      request.headers.get("authorization") === `Bearer ${secret}`
  );
}

export async function GET(request: Request) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json(
      { error: "Reconciliation is not configured." },
      { status: 503 }
    );
  }
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const startedAt = Date.now();
  const admin = createSupabaseAdminClient();
  let storageUsers = 0;
  let subscriptionsChecked = 0;
  let failures = 0;

  const { data: storage, error: storageError } = await admin.rpc(
    "reconcile_storage_usage_admin"
  );
  if (storageError) {
    logEvent("error", "reconciliation.storage_failed", {
      message: storageError.message.slice(0, 300)
    });
    return NextResponse.json(
      { error: "Storage reconciliation failed." },
      { status: 500 }
    );
  }
  storageUsers = Number(storage?.[0]?.users_updated ?? 0);

  if (hasStripeEnv()) {
    const { data: rows, error } = await admin
      .from("subscriptions")
      .select("stripe_subscription_id")
      .not("stripe_subscription_id", "is", null)
      .neq("status", "cancelled")
      .limit(1000);
    if (error) {
      logEvent("error", "reconciliation.subscription_list_failed", {
        message: error.message.slice(0, 300)
      });
      return NextResponse.json(
        { error: "Subscription reconciliation failed." },
        { status: 500 }
      );
    }

    for (const row of rows ?? []) {
      if (!row.stripe_subscription_id) continue;
      subscriptionsChecked += 1;
      try {
        const subscription = await getStripe().subscriptions.retrieve(
          row.stripe_subscription_id
        );
        await syncStripeSubscription(subscription);
      } catch {
        failures += 1;
      }
    }
  }

  logEvent(
    failures ? "error" : "info",
    "reconciliation.completed",
    {
      storageUsers,
      subscriptionsChecked,
      failures,
      durationMs: Date.now() - startedAt
    }
  );

  return NextResponse.json(
    {
      status: failures ? "degraded" : "ok",
      storageUsers,
      subscriptionsChecked,
      failures
    },
    { status: failures ? 500 : 200 }
  );
}