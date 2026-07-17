import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth-card";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { signupAction } from "../actions";

export default async function SignupPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <AuthCard
      title={t("signup.title")}
      description={t("signup.description")}
      footer={
        <p>
          {t("signup.hasAccount")} <Link href="/login">{t("signup.login")}</Link>
        </p>
      }
    >
      {query.error ? <p className="form-message form-error">{t("errors." + query.error)}</p> : null}
      <form className="auth-form" action={signupAction}>
        <input type="hidden" name="locale" value={locale} />
        <label>
          <span>{t("fields.displayName")}</span>
          <input name="displayName" type="text" autoComplete="name" maxLength={80} required />
        </label>
        <label>
          <span>{t("fields.email")}</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <label>
          <span>{t("fields.password")}</span>
          <input name="password" type="password" autoComplete="new-password" minLength={10} required />
          <small>{t("fields.passwordHint")}</small>
        </label>
        <button className="button button-primary button-block" type="submit">
          {t("signup.submit")}
        </button>
      </form>
    </AuthCard>
  );
}
