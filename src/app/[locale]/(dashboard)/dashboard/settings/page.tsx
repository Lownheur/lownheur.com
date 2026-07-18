import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { PrivateImage } from "@/components/private-image";
import { deleteAccountAction, removeAvatarAction, updateProfileAction } from "./actions";

const timezones = ["Europe/Paris", "Europe/London", "America/New_York", "America/Los_Angeles", "Asia/Dubai", "Asia/Tokyo", "UTC"];

export default async function SettingsPage({ params, searchParams }: { params: Promise<{ locale: AppLocale }>; searchParams: Promise<{ status?: string; error?: string }> }) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const [t, user, client] = await Promise.all([getTranslations({ locale, namespace: "Settings" }), requireUser(locale), createSupabaseServerClient()]);
  const { data: profile } = await client.from("profiles").select("display_name,username,locale,timezone,avatar_path").eq("user_id", user.id).single();
  const timezoneOptions = Array.from(new Set([profile?.timezone ?? "Europe/Paris", ...timezones]));
  const avatar = profile?.avatar_path ? await client.storage.from("user-media").createSignedUrl(profile.avatar_path, 600) : null;
  return <div className="dashboard-page settings-page">
    <header className="dashboard-heading"><div><span className="eyebrow">{t("eyebrow")}</span><h1>{t("title")}</h1></div><p>{t("description")}</p></header>
    <section className="settings-hub" aria-labelledby="settings-hub-title">
      <div className="settings-hub-heading"><h2 id="settings-hub-title">{t("hubTitle")}</h2><p>{t("hubDescription")}</p></div>
      <div className="settings-shortcuts">
        <Link className="settings-shortcut" href="/dashboard/connections">
          <span className="settings-shortcut-icon" aria-hidden="true">IA</span>
          <span><strong>{t("connectionsTitle")}</strong><small>{t("connectionsDescription")}</small></span>
          <span className="settings-shortcut-arrow" aria-hidden="true">→</span>
        </Link>
        <Link className="settings-shortcut" href="/dashboard/usage">
          <span className="settings-shortcut-icon" aria-hidden="true">%</span>
          <span><strong>{t("usageTitle")}</strong><small>{t("usageDescription")}</small></span>
          <span className="settings-shortcut-arrow" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
    {query.status === "updated" ? <p className="form-notice form-success">{t("updated")}</p> : null}{query.error ? <p className="form-notice form-error">{t("errors." + query.error)}</p> : null}
    <section className="dashboard-panel settings-panel">
      <div><h2>{t("profileTitle")}</h2><p>{t("profileDescription")}</p>{avatar?.data?.signedUrl ? <div className="avatar-preview"><PrivateImage src={avatar.data.signedUrl} alt={t("avatarAlt")} /><form action={removeAvatarAction}><input type="hidden" name="locale" value={locale} /><button className="button button-danger" type="submit">{t("removeAvatar")}</button></form></div> : null}</div>
      <form className="resource-form settings-form" action={updateProfileAction}><input type="hidden" name="locale" value={locale} /><label><span>{t("fields.displayName")}</span><input className="form-input" name="displayName" defaultValue={profile?.display_name ?? ""} required maxLength={80} /></label><label><span>{t("fields.username")}</span><input className="form-input" name="username" defaultValue={profile?.username ?? ""} pattern="[A-Za-z0-9_]{3,30}" required /></label><label><span>{t("fields.language")}</span><select className="form-input" name="profileLocale" defaultValue={profile?.locale ?? locale}><option value="fr">Français</option><option value="en">English</option></select></label><label><span>{t("fields.timezone")}</span><select className="form-input" name="timezone" defaultValue={profile?.timezone ?? "Europe/Paris"}>{timezoneOptions.map((timezone) => <option key={timezone} value={timezone}>{timezone}</option>)}</select></label><label className="form-wide"><span>{t("fields.avatar")}</span><input className="form-input file-input" type="file" name="avatar" accept="image/jpeg,image/png,image/webp,image/avif" /><small>{t("avatarHint")}</small></label><button className="button button-primary" type="submit">{t("save")}</button></form>
    </section>
    <details className="dashboard-panel danger-zone">
      <summary><span><strong>{t("deleteTitle")}</strong><small>{t("deleteDescription")}</small></span><span aria-hidden="true">+</span></summary>
      <form className="delete-account-form" action={deleteAccountAction}><input type="hidden" name="locale" value={locale} /><label><span>{t("deleteConfirmation", { word: locale === "fr" ? "SUPPRIMER" : "DELETE" })}</span><input className="form-input" name="confirmation" autoComplete="off" required /></label><button className="button button-danger" type="submit">{t("deleteButton")}</button></form>
    </details>
  </div>;
}
