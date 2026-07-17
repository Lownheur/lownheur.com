import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";

export async function SiteHeader({ locale }: { locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: "Navigation" });

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Logo />
        <nav className="desktop-nav" aria-label={t("label")}>
          <a href="#features">{t("features")}</a>
          <a href="#pricing">{t("pricing")}</a>
          <a href="#connect">{t("connect")}</a>
        </nav>
        <div className="header-actions">
          <LanguageSwitcher />
          <ThemeToggle />
          <Link className="button button-ghost header-login" href="/login">
            {t("login")}
          </Link>
          <Link className="button button-primary header-signup" href="/signup">
            {t("signup")}
          </Link>
        </div>
      </div>
    </header>
  );
}