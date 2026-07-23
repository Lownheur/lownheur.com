"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const navItems = [
  ["overview", "/dashboard"],
  ["settings", "/dashboard/settings"]
] as const;

type NavKey = (typeof navItems)[number][0];

function NavigationIcon({ item }: { item: NavKey }) {
  const paths: Record<NavKey, React.ReactNode> = {
    overview: <><path d="M3 10 10 4l7 6v7H3v-7Z" /><path d="M7 17v-5h6v5" /></>,
    settings: <><circle cx="10" cy="10" r="3" /><path d="M10 2v2m0 12v2M2 10h2m12 0h2M4.3 4.3l1.4 1.4m8.6 8.6 1.4 1.4m0-11.4-1.4 1.4m-8.6 8.6-1.4 1.4" /></>
  };

  return <svg className="dashboard-nav-icon" aria-hidden="true" viewBox="0 0 20 20">{paths[item]}</svg>;
}

export function DashboardNavigation() {
  const pathname = usePathname();
  const t = useTranslations("Dashboard");

  return (
    <nav className="dashboard-nav" aria-label={t("navigationLabel")}>
      {navItems.map(([key, href]) => {
        const active = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
        return (
          <Link key={key} href={href} aria-current={active ? "page" : undefined} aria-label={t("nav." + key)}>
            <NavigationIcon item={key} />
            <span className="dashboard-nav-label-full">{t("nav." + key)}</span>
            <span className="dashboard-nav-label-short">{t("navShort." + key)}</span>
          </Link>
        );
      })}
    </nav>
  );
}
