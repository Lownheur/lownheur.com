"use client";

import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const navItems = [
  ["overview", "/dashboard"],
  ["schedules", "/dashboard/schedules"],
  ["categories", "/dashboard/categories"],
  ["events", "/dashboard/events"],
  ["goals", "/dashboard/goals"],
  ["settings", "/dashboard/settings"]
] as const;

type NavKey = (typeof navItems)[number][0];

function NavigationIcon({ item }: { item: NavKey }) {
  const paths: Record<NavKey, React.ReactNode> = {
    overview: <><path d="M3 10 10 4l7 6v7H3v-7Z" /><path d="M7 17v-5h6v5" /></>,
    schedules: <><rect x="3" y="5" width="14" height="12" rx="2" /><path d="M6 3v4m8-4v4M3 9h14" /></>,
    categories: <><path d="M3 6h5l2 2h7v8H3V6Z" /><path d="M3 6V4h6l2 2" /></>,
    events: <><circle cx="10" cy="10" r="7" /><path d="m10 6 1.2 2.5 2.8.4-2 2 .5 2.8-2.5-1.3-2.5 1.3.5-2.8-2-2 2.8-.4L10 6Z" /></>,
    goals: <><circle cx="10" cy="10" r="7" /><circle cx="10" cy="10" r="3" /><path d="m12 8 5-5m-2 0h2v2" /></>,
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
