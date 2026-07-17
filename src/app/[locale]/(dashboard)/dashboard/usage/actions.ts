"use server";

import { z } from "zod";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import {
  getAppUrl,
  getStripeEnv,
  hasStripeEnv,
  isStripeAutomaticTaxEnabled
} from "@/lib/env";
import { redirectTo } from "@/lib/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStripe } from "@/server/billing";

function localeFrom(formData: FormData): AppLocale {
  return formData.get("locale") === "en" ? "en" : "fr";
}

function usagePath(locale: AppLocale, suffix = "") {
  return `/${locale}/dashboard/usage${suffix}`;
}

async function createPortalUrl(
  customerId: string,
  locale: AppLocale
) {
  const session = await getStripe().billingPortal.sessions.create({
    customer: customerId,
    return_url: getAppUrl() + usagePath(locale)
  });
  return session.url;
}

export async function startCheckoutAction(formData: FormData) {
  const locale = localeFrom(formData);
  const parsed = z
    .object({ plan: z.enum(["pro", "max"]) })
    .safeParse({ plan: formData.get("plan") });
  if (!parsed.success) {
    redirectTo(usagePath(locale, "?error=invalid_plan"));
  }
  if (!hasStripeEnv()) {
    redirectTo(usagePath(locale, "?error=not_configured"));
  }

  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  const { data: subscription, error } = await client
    .from("subscriptions")
    .select("stripe_customer_id,stripe_subscription_id,status")
    .eq("user_id", user.id)
    .single();
  if (error) {
    redirectTo(usagePath(locale, "?error=billing_failed"));
  }

  if (
    subscription.stripe_customer_id &&
    subscription.stripe_subscription_id &&
    subscription.status !== "cancelled"
  ) {
    const portalUrl = await createPortalUrl(
      subscription.stripe_customer_id,
      locale
    );
    redirectTo(portalUrl);
  }

  const { priceIds } = getStripeEnv();
  const baseUrl = getAppUrl();
  try {
    const session = await getStripe().checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceIds[parsed.data.plan], quantity: 1 }],
      client_reference_id: user.id,
      customer: subscription.stripe_customer_id ?? undefined,
      customer_email: subscription.stripe_customer_id
        ? undefined
        : user.email,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
      automatic_tax: { enabled: isStripeAutomaticTaxEnabled() },
      payment_method_collection: "always",
      locale,
      metadata: { user_id: user.id, plan: parsed.data.plan },
      subscription_data: {
        metadata: { user_id: user.id, plan: parsed.data.plan }
      },
      success_url:
        baseUrl +
        usagePath(
          locale,
          "?status=checkout_success&session_id={CHECKOUT_SESSION_ID}"
        ),
      cancel_url: baseUrl + usagePath(locale, "?status=checkout_cancelled")
    });
    if (!session.url) throw new Error("Stripe Checkout returned no URL.");
    redirectTo(session.url);
  } catch (checkoutError) {
    if (
      checkoutError &&
      typeof checkoutError === "object" &&
      "digest" in checkoutError
    ) {
      throw checkoutError;
    }
    redirectTo(usagePath(locale, "?error=billing_failed"));
  }
}

export async function openBillingPortalAction(formData: FormData) {
  const locale = localeFrom(formData);
  if (!hasStripeEnv()) {
    redirectTo(usagePath(locale, "?error=not_configured"));
  }
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  const { data, error } = await client
    .from("subscriptions")
    .select("stripe_customer_id")
    .eq("user_id", user.id)
    .single();
  if (error || !data.stripe_customer_id) {
    redirectTo(usagePath(locale, "?error=no_customer"));
  }
  try {
    redirectTo(await createPortalUrl(data.stripe_customer_id, locale));
  } catch (portalError) {
    if (
      portalError &&
      typeof portalError === "object" &&
      "digest" in portalError
    ) {
      throw portalError;
    }
    redirectTo(usagePath(locale, "?error=billing_failed"));
  }
}