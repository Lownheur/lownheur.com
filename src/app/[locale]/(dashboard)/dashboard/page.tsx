import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AppLocale } from "@/i18n/routing";
import { getUpcomingScheduleOccurrences } from "@/server/domain/resources";

const resources = ["categories", "events", "goals", "schedules"] as const;

export default async function DashboardPage({ params }: { params: Promise<{ locale: AppLocale }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "Dashboard" });
  const user = await requireUser(locale);
  const client = await createSupabaseServerClient();
  const [categories, events, goals, schedules, occurrences] =
    await Promise.all([
      client.from("categories").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      client.from("events").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      client.from("goals").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      client.from("schedules").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      getUpcomingScheduleOccurrences(client, { limit: 5 })
    ]);
  const eventIds = occurrences.flatMap((occurrence) => occurrence.eventId ? [occurrence.eventId] : []);
  const goalIds = occurrences.flatMap((occurrence) => occurrence.goalId ? [occurrence.goalId] : []);
  const [{ data: eventTargets }, { data: goalTargets }] = await Promise.all([
    eventIds.length
      ? client.from("events").select("id,title").eq("user_id", user.id).in("id", eventIds)
      : Promise.resolve({ data: [] }),
    goalIds.length
      ? client.from("goals").select("id,title").eq("user_id", user.id).in("id", goalIds)
      : Promise.resolve({ data: [] })
  ]);
  const targetTitles = new Map([
    ...(eventTargets ?? []).map((target) => [target.id, target.title] as const),
    ...(goalTargets ?? []).map((target) => [target.id, target.title] as const)
  ]);
  const counts = [categories.count ?? 0, events.count ?? 0, goals.count ?? 0, schedules.count ?? 0];

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
        {occurrences.length ? (
          <ul className="agenda-list">
            {occurrences.map((occurrence) => (
              <li key={occurrence.scheduleId + occurrence.startsAt}>
                <div>
                  <strong>{targetTitles.get(occurrence.eventId ?? occurrence.goalId ?? "") ?? t("resources.schedules.singular")}</strong>
                  <time dateTime={occurrence.startsAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short" }).format(new Date(occurrence.startsAt))}</time>
                </div>
                <span className="status-pill">{t("recurrences." + occurrence.recurrence)}</span>
              </li>
            ))}
          </ul>
        ) : <div className="empty-state"><strong>{t("overview.emptyTitle")}</strong><p>{t("overview.emptyDescription")}</p></div>}
      </section>
    </div>
  );
}
