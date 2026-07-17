import { getTranslations } from "next-intl/server";
import type { User } from "@supabase/supabase-js";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { LanguageSwitcher } from "./language-switcher";
import { Logo } from "./logo";
import { ThemeToggle } from "./theme-toggle";
import { logoutAction } from "@/app/[locale]/(auth)/actions";

const navItems = [
  ["overview", "/dashboard"],
  ["schedules", "/dashboard/schedules"],
  ["categories", "/dashboard/categories"],
  ["events", "/dashboard/events"],
  ["goals", "/dashboard/goals"],
  ["connections", "/dashboard/connections"],
  ["usage", "/dashboard/usage"],
  ["settings", "/dashboard/settings"]
] as const;

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
        <Logo />
        <nav className="dashboard-nav" aria-label={t("navigationLabel")}>
          {navItems.map(([key, href]) => (
            <Link key={key} href={href}>
              <span className="dashboard-nav-dot" aria-hidden="true" />
              {t("nav." + key)}
            </Link>
          ))}
        </nav>
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
        <header className="dashboard-topbar">
          <div>
            <span className="eyebrow">{t("workspace")}</span>
            <strong>Lownheur</strong>
          </div>
          <div className="header-actions">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>
        <main className="dashboard-content">{children}</main>
      </div>
    </div>
  );
}
