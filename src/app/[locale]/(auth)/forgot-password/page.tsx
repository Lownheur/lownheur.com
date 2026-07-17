import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthCard } from "@/components/auth-card";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { forgotPasswordAction } from "../actions";

export default async function ForgotPasswordPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<{ error?: string; status?: string }>;
}) {
  const { locale } = await params;
  const query = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("Auth");

  return (
    <AuthCard
      title={t("forgot.title")}
      description={t("forgot.description")}
      footer={<Link href="/login">← {t("forgot.back")}</Link>}
    >
      {query.error ? (
        <p className="form-message form-error">{t("errors." + query.error)}</p>
      ) : null}
      {query.status ? (
        <p className="form-message form-success">{t("status." + query.status)}</p>
      ) : null}
      <form className="auth-form" action={forgotPasswordAction}>
        <input type="hidden" name="locale" value={locale} />
        <label>
          <span>{t("fields.email")}</span>
          <input name="email" type="email" autoComplete="email" required />
        </label>
        <button className="button button-primary button-block" type="submit">
          {t("forgot.submit")}
        </button>
      </form>
    </AuthCard>
  );
}
