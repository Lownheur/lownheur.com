import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/i18n/routing";

const resources = ["categories", "events", "goals", "schedules"] as const;

export default async function DashboardPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  const [{ data: categories }, { data: events }, { data: goals }, { data: schedules }] =
    await Promise.all([
      client.from("categories").select("id", { count: "exact" }).eq("user_id", user.id),
      client.from("events").select("id", { count: "exact" }).eq("user_id", user.id),
      client.from("goals").select("id", { count: "exact" }).eq("user_id", user.id),
      client
        .from("schedules")
        .select("id,starts_at,status")
        .eq("user_id", user.id)
        .gte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: true })
        .limit(5)
    ]);
  const counts = [categories?.length ?? 0, events?.length ?? 0, goals?.length ?? 0, schedules?.length ?? 0];

  return (
    <div className="dashboard-page dashboard-overview-page">
      <header className="dashboard-heading dashboard-overview-heading">
        <div><span className="eyebrow">{t("overview.eyebrow")}</span><h1>{t("overview.title")}</h1></div>
        <p>{t("overview.description")}</p>
      </header>
      <section className="stats-grid" aria-label={t("overview.statsLabel")}>
        {resources.map((resource, index) => (
          <Link className="stat-card" href={("/dashboard/" + resource) as "/dashboard"} key={resource}>
            <span>{t("nav." + resource)}</span><strong>{counts[index]}</strong><small>{t("viewAll")}</small>
          </Link>
        ))}
      </section>
      <section className="dashboard-panel">
        <div className="panel-heading"><div><h2>{t("overview.upcoming")}</h2><p>{t("overview.upcomingDescription")}</p></div><Link href="/dashboard/schedules">{t("viewAll")}</Link></div>
        {schedules?.length ? (
          <ul className="agenda-list">
            {schedules.map((schedule) => (
              <li key={schedule.id}><time dateTime={schedule.starts_at}>{new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(schedule.starts_at))}</time><span className="status-pill">{t("statuses." + schedule.status)}</span></li>
            ))}
          </ul>
        ) : <div className="empty-state"><strong>{t("overview.emptyTitle")}</strong><p>{t("overview.emptyDescription")}</p></div>}
      </section>
    </div>
  );
}
