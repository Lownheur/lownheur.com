import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth-card";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { loginAction } from "../actions";

export default async function LoginPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ error?: string; status?: string; next?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <AuthCard
      title={t("login.title")}
      description={t("login.description")}
      footer={
        <p>
          {t("login.noAccount")} <Link href="/signup">{t("login.signup")}</Link>
        </p>
      }
    >
      {query.error ? <p className="form-message form-error">{t("errors." + query.error)}</p> : null}
      {query.status ? <p className="form-message form-success">{t("status." + query.status)}</p> : null}
      <form className="auth-form" action={loginAction}>
        <input type="hidden" name="locale" value={locale} />
        <input type="hidden" name="next" value={query.next ?? ""} />
        <label>
          <span>{t("fields.email")}</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          <span>{t("fields.password")}</span>
          <input name="password" type="password" autoComplete="current-password" required />
        </label>
        <div className="form-row">
          <Link href="/forgot-password">{t("login.forgot")}</Link>
        </div>
        <button className="button button-primary button-block" type="submit">
          {t("login.submit")}
        </button>
      </form>
    </AuthCard>
  );
}
