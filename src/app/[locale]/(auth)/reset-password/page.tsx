import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth-card";
import type { AppLocale } from "@/i18n/routing";
import { updatePasswordAction } from "../actions";

export default async function ResetPasswordPage({
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
      title={t("reset.title")}
      description={t("reset.description")}
      footer={<p>{t("reset.footer")}</p>}
    >
      {query.error ? (
        <p className="form-message form-error">{t("errors." + query.error)}</p>
      ) : null}
      <form className="auth-form" action={updatePasswordAction}>
        <input type="hidden" name="locale" value={locale} />
        <label>
          <span>{t("fields.newPassword")}</span>
          <input
            name="password"
            type="password"
            autoComplete="new-password"
            minLength={10}
            required
          />
        </label>
        <button className="button button-primary button-block" type="submit">
          {t("reset.submit")}
        </button>
      </form>
    </AuthCard>
  );
}
