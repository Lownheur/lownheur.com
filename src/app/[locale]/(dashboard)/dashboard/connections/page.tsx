import { getTranslations } from "next-intl/server";
import type { OAuthGrant } from "@supabase/supabase-js";
import type { AppLocale } from "@/i18n/routing";
import { getAppUrl, hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { revokeGrantAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage({ params, searchParams }: { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ status?: string; error?: string }> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const t = await getTranslations({ locale, namespace: "Mcp" });
  const endpoint = getAppUrl() + "/mcp";
  let grants: OAuthGrant[] = [];
  let oauthReady = false;
  if (hasSupabaseEnv()) {
    const client = await createSupabaseServerClient();
    const response = await client.auth.oauth.listGrants();
    grants = response.data ?? [];
    oauthReady = !response.error;
  }

  return <div className="dashboard-page">
    <header className="dashboard-heading"><div><span className="eyebrow">MCP</span><h1>{t("title")}</h1></div><p>{t("description")}</p></header>
    {query.status === "revoked" ? <p className="form-notice form-success">{t("revoked")}</p> : null}
    {query.error ? <p className="form-notice form-error">{t("errors." + query.error)}</p> : null}
    <section className="dashboard-panel endpoint-panel"><div><span className="eyebrow">{t("endpointLabel")}</span><h2>{t("endpointTitle")}</h2></div><code>{endpoint}</code><p>{oauthReady ? t("oauthReady") : t("oauthSetup")}</p></section>
    <section className="connection-grid">
      {(["chatgpt", "claude", "generic"] as const).map((client) => <article className="connection-card" key={client}><span className="client-mark">{client.slice(0, 2).toUpperCase()}</span><h2>{t("guides." + client + ".title")}</h2><ol><li>{t("guides." + client + ".step1")}</li><li>{t("guides." + client + ".step2", { endpoint })}</li><li>{t("guides." + client + ".step3")}</li></ol></article>)}
    </section>
    <section className="dashboard-panel"><div className="panel-heading"><div><h2>{t("grantsTitle")}</h2><p>{t("grantsDescription")}</p></div></div>
      {grants.length ? <div className="grant-list">{grants.map((grant) => <article className="grant-row" key={grant.client.id}><div><strong>{grant.client.name}</strong><span>{grant.scopes.join(" · ")}</span><small>{new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(new Date(grant.granted_at))}</small></div><form action={revokeGrantAction}><input type="hidden" name="locale" value={locale} /><input type="hidden" name="clientId" value={grant.client.id} /><button className="button button-danger" type="submit">{t("revoke")}</button></form></article>)}</div> : <div className="empty-state"><strong>{t("emptyTitle")}</strong><p>{t("emptyDescription")}</p></div>}
    </section>
  </div>;
}
