import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { redirectTo } from "@/lib/navigation";
import { getCurrentUser } from "@/lib/auth";
import { hasSupabaseEnv } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { approveOAuthAction, denyOAuthAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function OAuthConsentPage({ searchParams }: { searchParams: Promise<{ authorization_id?: string; error?: string }> }) {
  const query = await searchParams;
  const authorizationId = query.authorization_id;
  if (!hasSupabaseEnv()) return <ConsentError message="Supabase OAuth is not configured." />;
  if (!authorizationId) return <ConsentError message="This authorization request is incomplete." />;
  const user = await getCurrentUser();
  if (!user) redirectTo("/fr/login?next=" + encodeURIComponent("/oauth/consent?authorization_id=" + authorizationId));

  const client = await createSupabaseServerClient();
  const [{ data: profile }, details] = await Promise.all([
    client.from("profiles").select("locale").eq("user_id", user.id).maybeSingle(),
    client.auth.oauth.getAuthorizationDetails(authorizationId)
  ]);
  const locale = profile?.locale === "en" ? "en" : "fr";
  const t = await getTranslations({ locale, namespace: "OAuth" });
  if (details.error || !details.data) return <ConsentError message={t("errors.invalid_request")} />;
  if ("redirect_url" in details.data) redirectTo(details.data.redirect_url);
  const scopes = details.data.scope.split(" ").filter(Boolean);

  return <main className="auth-shell"><section className="auth-card consent-card">
    <Link className="logo" href={locale === "en" ? "/en" : "/fr"}><span className="logo-mark">L</span><span>Lownheur</span></Link>
    <div className="auth-heading"><span className="eyebrow">{t("eyebrow")}</span><h1>{t("title", { client: details.data.client.name })}</h1><p>{t("description")}</p></div>
    {query.error ? <p className="form-message form-error">{t("errors.decision_failed")}</p> : null}
    <div className="consent-client"><strong>{details.data.client.name}</strong>{details.data.client.uri ? <span>{details.data.client.uri}</span> : null}</div>
    <div><strong>{t("permissionsTitle")}</strong><ul className="consent-permissions"><li>{t("permissions.resources")}</li><li>{t("permissions.mutate")}</li>{scopes.map((scope) => <li key={scope}>{t("scope", { scope })}</li>)}</ul></div>
    <p className="consent-warning">{t("warning")}</p>
    <div className="consent-actions"><form action={denyOAuthAction}><input type="hidden" name="authorizationId" value={authorizationId} /><button className="button" type="submit">{t("deny")}</button></form><form action={approveOAuthAction}><input type="hidden" name="authorizationId" value={authorizationId} /><button className="button button-primary" type="submit">{t("approve")}</button></form></div>
    <div className="auth-footer">{t("account", { email: user.email ?? "" })}</div>
  </section></main>;
}

function ConsentError({ message }: { message: string }) {
  return <main className="auth-shell"><section className="auth-card"><Link className="logo" href="/fr"><span className="logo-mark">L</span><span>Lownheur</span></Link><div className="auth-heading"><h1>Autorisation impossible</h1><p>{message}</p></div></section></main>;
}
