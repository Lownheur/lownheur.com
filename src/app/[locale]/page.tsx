import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { PLAN_LIMITS, type PlanId } from "@/lib/plans";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";

const featureKeys = ["categories", "events", "goals", "schedules"] as const;
const clients = ["ChatGPT", "Claude", "MCP"] as const;
const plans: PlanId[] = ["free", "pro", "max"];

export default async function LandingPage() {
  const t = await getTranslations("Landing");
  const common = await getTranslations("Common");

  return (
    <>
      <a className="skip-link" href="#main-content">
        {t("skip")}
      </a>
      <SiteHeader />
      <main id="main-content">
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">
                <span className="eyebrow-dot" aria-hidden="true" />
                {t("eyebrow")}
              </div>
              <h1>{t("title")}</h1>
              <p className="hero-copy">{t("subtitle")}</p>
              <div className="hero-actions">
                <Link className="button button-primary" href="/signup">
                  {t("primaryCta")} →
                </Link>
                <a className="button" href="#features">
                  {t("secondaryCta")}
                </a>
              </div>
              <p className="hero-trust">{t("trust")}</p>
            </div>
            <div className="product-preview" aria-label={t("previewLabel")}>
              <div className="preview-window">
                <div className="preview-bar">
                  <span className="preview-dot" />
                  <span className="preview-dot" />
                  <span className="preview-dot" />
                </div>
                <div className="preview-content">
                  <div className="preview-sidebar">
                    <div className="preview-nav" />
                    <div className="preview-nav" />
                    <div className="preview-nav" />
                    <div className="preview-nav" />
                  </div>
                  <div className="preview-main">
                    <div className="preview-title" />
                    <div className="preview-cards">
                      <div className="preview-card" />
                      <div className="preview-card" />
                    </div>
                    <div className="preview-agenda">
                      {["09:00", "14:30", "18:00"].map((time) => (
                        <div className="preview-row" key={time}>
                          <span className="preview-time">{time}</span>
                          <span className="preview-line" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section" id="features">
          <div className="container">
            <div className="section-heading">
              <div className="eyebrow">{t("featuresEyebrow")}</div>
              <h2>{t("featuresTitle")}</h2>
              <p>{t("featuresSubtitle")}</p>
            </div>
            <div className="feature-grid">
              {featureKeys.map((key, index) => (
                <article className="feature-card" key={key}>
                  <span className="feature-index">0{index + 1}</span>
                  <h3>{t("features." + key + ".title")}</h3>
                  <p>{t("features." + key + ".description")}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section section-muted" id="pricing">
          <div className="container">
            <div className="section-heading">
              <div className="eyebrow">{t("pricingEyebrow")}</div>
              <h2>{t("pricingTitle")}</h2>
              <p>{t("pricingSubtitle")}</p>
            </div>
            <div className="pricing-grid">
              {plans.map((planId) => {
                const plan = PLAN_LIMITS[planId];
                return (
                  <article
                    className={"pricing-card " + (planId === "pro" ? "pricing-card-featured" : "")}
                    key={planId}
                  >
                    {planId === "pro" ? <span className="plan-badge">{t("popular")}</span> : null}
                    <div className="plan-name">{plan.name}</div>
                    <div className="plan-price">
                      {plan.priceEur} € <span>/ {common("monthly")}</span>
                    </div>
                    <ul className="plan-features">
                      <li>{plan.storageLabel} {common("storage")}</li>
                      <li>{plan.mcpCalls.toLocaleString()} {common("calls")}</li>
                      <li>{t("planFeatures.dashboard")}</li>
                      <li>{t("planFeatures.languages")}</li>
                    </ul>
                    <Link className={"button " + (planId === "pro" ? "button-primary" : "")} href="/signup">
                      {planId === "free" ? common("free") : common("choose")} {plan.name}
                    </Link>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="section" id="connect">
          <div className="container">
            <div className="section-heading">
              <div className="eyebrow">{t("mcpEyebrow")}</div>
              <h2>{t("mcpTitle")}</h2>
              <p>{t("mcpSubtitle")}</p>
            </div>
            <div className="connect-grid">
              {clients.map((client) => (
                <article className="connect-card" key={client}>
                  <div className="client-mark">{client.slice(0, 2).toUpperCase()}</div>
                  <h3>{client}</h3>
                  <p>{t("clients." + client.toLowerCase())}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container cta-panel">
            <h2>{t("ctaTitle")}</h2>
            <Link className="button" href="/signup">
              {t("primaryCta")} →
            </Link>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
