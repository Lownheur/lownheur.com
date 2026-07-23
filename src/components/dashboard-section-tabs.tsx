"use client";

import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";

const sections = ["today", "organize", "calendar"] as const;

export function DashboardSectionTabs() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const t = useTranslations("Dashboard");
  const section = searchParams.get("section") ?? "today";
  const dashboardActive = pathname === "/dashboard";
  const settingsActive = pathname.startsWith("/dashboard/settings")
    || pathname.startsWith("/dashboard/connections")
    || pathname.startsWith("/dashboard/usage");

  return (
    <nav className="dashboard-section-tabs" aria-label={t("unified.sectionLabel")}>
      {sections.map((item) => (
        <Link
          key={item}
          className={dashboardActive && section === item ? "is-active" : undefined}
          aria-current={dashboardActive && section === item ? "page" : undefined}
          href={{ pathname: "/dashboard", query: { section: item } }}
        >
          <span className="dashboard-section-label-full">{t("unified.sections." + item)}</span>
          <span className="dashboard-section-label-compact">{t("unified.sectionsCompact." + item)}</span>
        </Link>
      ))}
      <Link
        className={settingsActive ? "is-active" : undefined}
        aria-current={settingsActive ? "page" : undefined}
        href="/dashboard/settings"
      >
        <span className="dashboard-section-label-full">{t("nav.settings")}</span>
        <span className="dashboard-section-label-compact">{t("unified.sectionsCompact.settings")}</span>
      </Link>
    </nav>
  );
}
