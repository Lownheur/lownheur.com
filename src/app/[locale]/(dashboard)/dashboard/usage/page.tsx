import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import { hasStripeEnv } from "@/lib/env";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  hasPaidEntitlement,
  type BillingStatus
} from "@/server/billing";
import {
  openBillingPortalAction,
  startCheckoutAction
} from "./actions";

export const dynamic = "force-dynamic";

function percentage(value: number, limit: number) {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((value / limit) * 100));
}

function bytes(value: number, locale: AppLocale) {
  return new Intl.NumberFormat(locale, {
    style: "unit",
    unit: value >= 1_000_000_000 ? "gigabyte" : "megabyte",
    unitDisplay: "short",
    maximumFractionDigits: 2
  }).format(
    value >= 1_000_000_000
      ? value / 1_000_000_000
      : value / 1_000_000
  );
}

export default async function UsagePage({
  params,
  searchParams
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ status?: string; error?: string }>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const [t, user, client] = await Promise.all([
    getTranslations({ locale, namespace: "Usage" }),
    requireUser(locale),
    createSupabaseServerClient()
  ]);

  const periodStart = new Date();
  periodStart.setUTCDate(1);
  const periodKey = periodStart.toISOString().slice(0, 10);
  const [subscriptionResult, usageResult, storageResult] = await Promise.all([
    client
      .from("subscriptions")
      .select(
        "plan,status,current_period_end,cancel_at_period_end,stripe_customer_id"
      )
      .eq("user_id", user.id)
      .single(),
    client
      .from("usage_periods")
      .select("mcp_calls,period_end")
      .eq("user_id", user.id)
      .eq("period_start", periodKey)
      .maybeSingle(),
    client
      .from("storage_usage")
      .select("bytes_used")
      .eq("user_id", user.id)
      .single()
  ]);

  const subscription = subscriptionResult.data;
  const status = (subscription?.status ?? "active") as BillingStatus;
  const storedPlan = (subscription?.plan ?? "free") as PlanId;
  const plan = hasPaidEntitlement(status) ? storedPlan : "free";
  const limits = PLAN_LIMITS[plan];
  const calls = Number(usageResult.data?.mcp_calls ?? 0);
  const storage = Number(storageResult.data?.bytes_used ?? 0);
  const stripeReady = hasStripeEnv();
  const hasCustomer = Boolean(subscription?.stripe_customer_id);

  return (
    <div className="dashboard-page usage-page">
      <header className="dashboard-heading">
        <div>
          <span className="eyebrow">{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
        </div>
        <p>{t("description")}</p>
      </header>

      {query.status === "checkout_success" ? (
        <p className="form-notice form-success">
          {t("messages.checkoutSuccess")}
        </p>
      ) : null}
      {query.status === "checkout_cancelled" ? (
        <p className="form-notice">{t("messages.checkoutCancelled")}</p>
      ) : null}
      {query.error ? (
        <p className="form-notice form-error">
          {t(`errors.${query.error}`)}
        </p>
      ) : null}
      {!stripeReady ? (
        <p className="form-notice">{t("stripeSetup")}</p>
      ) : null}

      <section className="dashboard-panel current-plan">
        <div>
          <span className="eyebrow">{t("currentTitle")}</span>
          <h2>{t(`plans.${plan}.name`)}</h2>
          <p>
            {t(`statuses.${status}`)}
            {subscription?.cancel_at_period_end
              ? " - " + t("cancelsAtPeriodEnd")
              : ""}
          </p>
          {subscription?.current_period_end ? (
            <small>
              {t("renews", {
                date: new Intl.DateTimeFormat(locale, {
                  dateStyle: "long"
                }).format(new Date(subscription.current_period_end))
              })}
            </small>
          ) : null}
        </div>
        {stripeReady && hasCustomer ? (
          <form action={openBillingPortalAction}>
            <input type="hidden" name="locale" value={locale} />
            <button className="button" type="submit">
              {t("manage")}
            </button>
          </form>
        ) : null}
      </section>

      <section className="usage-grid" aria-label={t("usageTitle")}>
        <article className="dashboard-panel usage-meter">
          <div>
            <span>{t("mcpCalls")}</span>
            <strong>
              {new Intl.NumberFormat(locale).format(calls)} /{" "}
              {new Intl.NumberFormat(locale).format(limits.mcpCalls)}
            </strong>
          </div>
          <div
            className="meter-track"
            role="progressbar"
            aria-valuenow={calls}
            aria-valuemax={limits.mcpCalls}
          >
            <span style={{ width: percentage(calls, limits.mcpCalls) + "%" }} />
          </div>
          <small>{t("monthlyReset")}</small>
        </article>
        <article className="dashboard-panel usage-meter">
          <div>
            <span>{t("storage")}</span>
            <strong>
              {bytes(storage, locale)} / {limits.storageLabel}
            </strong>
          </div>
          <div
            className="meter-track"
            role="progressbar"
            aria-valuenow={storage}
            aria-valuemax={limits.storageBytes}
          >
            <span
              style={{
                width: percentage(storage, limits.storageBytes) + "%"
              }}
            />
          </div>
          <small>{t("storageLive")}</small>
        </article>
      </section>

      <section>
        <div className="panel-heading usage-offers-heading">
          <div>
            <h2>{t("offersTitle")}</h2>
            <p>{t("offersDescription")}</p>
          </div>
        </div>
        <div className="usage-plan-grid">
          {(Object.keys(PLAN_LIMITS) as PlanId[]).map((planId) => {
            const offer = PLAN_LIMITS[planId];
            const isCurrent = planId === plan;
            return (
              <article
                className={
                  "dashboard-panel usage-plan-card " +
                  (planId === "pro" ? "usage-plan-featured" : "")
                }
                key={planId}
              >
                <div>
                  <span className="plan-name">
                    {t(`plans.${planId}.name`)}
                  </span>
                  <div className="usage-plan-price">
                    {offer.priceEur} EUR
                    <small> / {t("month")}</small>
                  </div>
                </div>
                <ul>
                  <li>{offer.storageLabel} {t("storage")}</li>
                  <li>
                    {new Intl.NumberFormat(locale).format(offer.mcpCalls)}{" "}
                    {t("mcpCalls")}
                  </li>
                  <li>{t("dashboardIncluded")}</li>
                </ul>
                {planId === "free" || isCurrent ? (
                  <button className="button" type="button" disabled>
                    {isCurrent ? t("current") : t("freeIncluded")}
                  </button>
                ) : (
                  <form action={startCheckoutAction}>
                    <input type="hidden" name="locale" value={locale} />
                    <input type="hidden" name="plan" value={planId} />
                    <button
                      className="button button-primary"
                      type="submit"
                      disabled={!stripeReady}
                    >
                      {t("choose", {
                        plan: t(`plans.${planId}.name`)
                      })}
                    </button>
                  </form>
                )}
              </article>
            );
          })}
        </div>
      </section>
    </div>
  );
}