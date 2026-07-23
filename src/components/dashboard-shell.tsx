import { getTranslations } from "next-intl/server";
import type { User } from "@supabase/supabase-js";
import type { AppLocale } from "@/i18n/routing";
import { DashboardNavigation } from "./dashboard-navigation";
import { DashboardSectionTabs } from "./dashboard-section-tabs";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/app/[locale]/(auth)/actions";

export async function DashboardShell({
  locale,
  user,
  children
}: {
  locale: AppLocale;
  user: User;
  children: React.ReactNode;
}) {
  const t = await getTranslations({ locale, namespace: "Dashboard" });

  return (
    <div className="dashboard-shell">
      <aside className="dashboard-sidebar">
        <div className="dashboard-sidebar-header">
          <Logo />
          <div className="header-actions">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </div>
        <DashboardNavigation />
        <div className="dashboard-user">
          <span>{user.email}</span>
          <form action={logoutAction}>
            <input type="hidden" name="locale" value={locale} />
            <button className="button button-ghost" type="submit">
              {t("logout")}
            </button>
          </form>
        </div>
      </aside>
      <div className="dashboard-main">
        <main className="dashboard-content">
          <DashboardSectionTabs />
          {children}
        </main>
      </div>
    </div>
  );
}
