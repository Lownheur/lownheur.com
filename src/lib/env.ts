const PUBLIC_SUPABASE_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
] as const;

export function hasSupabaseEnv() {
  return PUBLIC_SUPABASE_KEYS.every((key) => Boolean(process.env[key]));
}

export function getSupabaseEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !publishableKey) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }
  return { url, publishableKey };
}

export function getSupabaseAdminEnv() {
  const { url } = getSupabaseEnv();
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  if (!secretKey) {
    throw new Error("Supabase admin is not configured. Set SUPABASE_SECRET_KEY.");
  }
  return { url, secretKey };
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(
    /\/$/,
    ""
  );
}

export function hasStripeEnv() {
  return [
    "STRIPE_SECRET_KEY",
    "STRIPE_WEBHOOK_SECRET",
    "STRIPE_PRO_PRICE_ID",
    "STRIPE_MAX_PRICE_ID"
  ].every((key) => Boolean(process.env[key]));
}

export function getStripeEnv() {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const proPriceId = process.env.STRIPE_PRO_PRICE_ID;
  const maxPriceId = process.env.STRIPE_MAX_PRICE_ID;
  if (!secretKey || !webhookSecret || !proPriceId || !maxPriceId) {
    throw new Error(
      "Stripe is not configured. Set STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, STRIPE_PRO_PRICE_ID and STRIPE_MAX_PRICE_ID."
    );
  }
  return {
    secretKey,
    webhookSecret,
    priceIds: { pro: proPriceId, max: maxPriceId }
  } as const;
}

export function isStripeAutomaticTaxEnabled() {
  return process.env.STRIPE_AUTOMATIC_TAX === "true";
}