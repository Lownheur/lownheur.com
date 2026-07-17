import { getTranslations } from "next-intl/server";
import { Logo } from "./logo";
import { Link } from "@/i18n/navigation";
import type { AppLocale } from "@/i18n/routing";

export async function SiteFooter({ locale }: { locale: AppLocale }) {
  const t = await getTranslations({ locale, namespace: "Footer" });
  return (
    <footer className="site-footer">
      <div className="container footer-inner">
        <div>
          <Logo />
          <p>{t("copyright", { year: new Date().getFullYear() })}</p>
        </div>
        <nav className="footer-links" aria-label={t("label")}>
          <Link href="/privacy">{t("privacy")}</Link>
          <Link href="/terms">{t("terms")}</Link>
          <Link href="/legal">{t("legal")}</Link>
          <Link href="/support">{t("support")}</Link>
        </nav>
      </div>
    </footer>
  );
}