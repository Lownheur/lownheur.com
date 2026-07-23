import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildCalendarRange,
  dateInTimeZone,
  normalizeDateOnly,
  startOfIsoWeek
} from "@/lib/calendar";
import { ResourceManager } from "@/components/resource-manager";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import {
  buildCategoryOptions,
  getScheduleOccurrencesInRange,
  listResources,
  type ResourceName,
  type ResourcePage,
  type ResourceRecord
} from "@/server/domain/resources";
import { getResourceMediaMap } from "@/server/media";
import {
  setGoalCheckInAction,
  setOccurrenceCompletedAction
} from "./actions";

type Section = "today" | "organize" | "calendar";
type DashboardQuery = {
  section?: string;
  manage?: string;
  cursor?: string;
  search?: string;
  status?: string;
  error?: string;
  dialog?: string;
  id?: string;
  view?: string;
  date?: string;
};

function periodStart(goal: ResourceRecord, today: string) {
  if (goal.period === "week") return startOfIsoWeek(today);
  if (goal.period === "month") return today.slice(0, 7) + "-01";
  if (goal.period === "once") return String(goal.created_at).slice(0, 10);
  return today;
}

function CategoryBranch({
  category,
  categories,
  events,
  goals,
  goalTitles
}: {
  category: ResourceRecord;
  categories: ResourceRecord[];
  events: ResourceRecord[];
  goals: ResourceRecord[];
  goalTitles: Map<string, string>;
}) {
  const children = categories.filter((item) => item.parent_id === category.id);
  const directEvents = events.filter((item) => item.category_id === category.id);
  const directGoals = goals.filter((item) => item.category_id === category.id);
  return (
    <details className="organization-category" open={category.parent_id === null}>
      <summary>
        <span className="organization-folder" aria-hidden="true">⌁</span>
        <strong>{String(category.title)}</strong>
        <small>{children.length + directEvents.length + directGoals.length}</small>
      </summary>
      <div className="organization-branch">
        {children.map((child) => (
          <CategoryBranch
            key={child.id}
            category={child}
            categories={categories}
            events={events}
            goals={goals}
            goalTitles={goalTitles}
          />
        ))}
        {directEvents.map((event) => (
          <article className="organization-item is-event" key={event.id}>
            <span>É</span>
            <div>
              <strong>{String(event.title)}</strong>
              {Array.isArray(event.goal_ids) && event.goal_ids.length ? (
                <small>
                  → {event.goal_ids.map((goalId) => goalTitles.get(String(goalId))).filter(Boolean).join(", ")}
                </small>
              ) : null}
            </div>
          </article>
        ))}
        {directGoals.map((goal) => (
          <article className="organization-item is-goal" key={goal.id}>
            <span>◎</span>
            <div>
              <strong>{String(goal.title)}</strong>
              <small>{String(goal.target_value)} {String(goal.unit)}</small>
            </div>
          </article>
        ))}
        {!children.length && !directEvents.length && !directGoals.length ? (
          <p className="organization-empty">Cette catégorie est vide.</p>
        ) : null}
      </div>
    </details>
  );
}

export default async function DashboardPage({
  params,
  searchParams
}: {
  params: Promise<{ locale: AppLocale }>;
  searchParams: Promise<DashboardQuery>;
}) {
  const [{ locale }, query] = await Promise.all([params, searchParams]);
  const section: Section = query.section === "organize" || query.section === "calendar"
    ? query.section
    : "today";
  const manage = ["categories", "events", "goals", "schedules"].includes(query.manage ?? "")
    ? query.manage as ResourceName
    : section === "calendar"
      ? "schedules"
      : undefined;
  const [t, user, client] = await Promise.all([
    getTranslations({ locale, namespace: "Dashboard" }),
    requireUser(locale),
    createSupabaseServerClient()
  ]);
  const [categoryResult, eventResult, goalResult, profileResult] = await Promise.all([
    client.from("categories").select("*").eq("user_id", user.id).order("title"),
    client.from("events").select("*,event_goals(goal_id)").eq("user_id", user.id).order("title"),
    client.from("goals").select("*").eq("user_id", user.id).order("title"),
    client.from("profiles").select("timezone").eq("user_id", user.id).maybeSingle()
  ]);
  const categories = (categoryResult.data ?? []) as ResourceRecord[];
  const events: ResourceRecord[] = ((eventResult.data ?? []) as unknown as Array<ResourceRecord & {
    event_goals?: Array<{ goal_id: string }>;
  }>).map((event) => ({
    ...event,
    goal_ids: (event.event_goals ?? []).map((link) => link.goal_id)
  } as ResourceRecord));
  const goals = (goalResult.data ?? []) as ResourceRecord[];
  const timezone = profileResult.data?.timezone ?? "UTC";
  const today = dateInTimeZone(new Date(), timezone);
  const selectedDate = normalizeDateOnly(query.date, timezone);
  const calendarView = query.view === "day" ? "day" : "week";
  const calendarRange = buildCalendarRange(calendarView, selectedDate, timezone);
  const occurrences = await getScheduleOccurrencesInRange(client, {
    from: section === "today"
      ? buildCalendarRange("day", today, timezone).from
      : calendarRange.from,
    to: section === "today"
      ? buildCalendarRange("day", today, timezone).to
      : calendarRange.to
  });
  const { data: checkIns } = goals.length
    ? await client
        .from("goal_check_ins")
        .select("goal_id,period_start,value,completed_at")
        .eq("user_id", user.id)
        .order("period_start", { ascending: false })
        .limit(366)
    : { data: [] };
  const checkedGoals = new Map((checkIns ?? []).map((item) => [
    item.goal_id + "|" + item.period_start,
    item
  ]));
  const eventTitles = new Map(events.map((item) => [item.id, String(item.title)]));
  const goalTitles = new Map(goals.map((item) => [item.id, String(item.title)]));
  const categoryOptions = buildCategoryOptions(categories);

  let managerPage: ResourcePage = { items: [], nextCursor: null };
  let managerMedia = {};
  if (manage) {
    if (manage === "categories") {
      managerPage = { items: categories, nextCursor: null };
    } else {
      managerPage = await listResources(client, user.id, manage, {
        limit: 20,
        cursor: query.cursor,
        search: manage === "schedules" ? undefined : query.search
      });
    }
    managerMedia = await getResourceMediaMap(client, user.id, manage, managerPage.items);
  }

  return (
    <div className="dashboard-page unified-dashboard">
      <header className="dashboard-heading unified-dashboard-heading">
        <div>
          <span className="eyebrow">{t("workspace")}</span>
          <h1>{t("unified.title")}</h1>
        </div>
        <p>{t("unified.description")}</p>
      </header>

      <nav className="dashboard-section-tabs" aria-label={t("unified.sectionLabel")}>
        {(["today", "organize", "calendar"] as const).map((item) => (
          <Link
            key={item}
            className={section === item ? "is-active" : undefined}
            aria-current={section === item ? "page" : undefined}
            href={{ pathname: "/dashboard", query: { section: item } }}
          >
            {t("unified.sections." + item)}
          </Link>
        ))}
      </nav>

      {section === "today" ? (
        <div className="today-layout">
          <section className="dashboard-panel">
            <div className="panel-heading"><div><h2>{t("unified.todayEvents")}</h2><p>{t("unified.todayEventsHint")}</p></div></div>
            {occurrences.length ? (
              <ul className="check-list">
                {occurrences.map((occurrence) => (
                  <li className={occurrence.completedAt ? "is-completed" : undefined} key={occurrence.scheduleId + occurrence.startsAt}>
                    <form action={setOccurrenceCompletedAction}>
                      <input type="hidden" name="locale" value={locale} />
                      <input type="hidden" name="scheduleId" value={occurrence.scheduleId} />
                      <input type="hidden" name="occurrenceStartsAt" value={occurrence.startsAt} />
                      <input type="hidden" name="completed" value={occurrence.completedAt ? "false" : "true"} />
                      <button className="check-button" type="submit" aria-label={occurrence.completedAt ? t("unified.uncheck") : t("unified.check")}>
                        {occurrence.completedAt ? "✓" : ""}
                      </button>
                    </form>
                    <div>
                      <strong>{eventTitles.get(occurrence.eventId) ?? t("calendar.unknownTarget")}</strong>
                      <time dateTime={occurrence.startsAt}>{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(occurrence.startsAt))}</time>
                    </div>
                  </li>
                ))}
              </ul>
            ) : <div className="empty-state"><strong>{t("overview.emptyTitle")}</strong><p>{t("unified.emptyEvents")}</p></div>}
          </section>
          <section className="dashboard-panel">
            <div className="panel-heading"><div><h2>{t("unified.goalTracking")}</h2><p>{t("unified.goalTrackingHint")}</p></div></div>
            {goals.length ? (
              <ul className="check-list">
                {goals.map((goal) => {
                  const start = periodStart(goal, today);
                  const checked = checkedGoals.has(goal.id + "|" + start);
                  return (
                    <li className={checked ? "is-completed" : undefined} key={goal.id}>
                      <form action={setGoalCheckInAction}>
                        <input type="hidden" name="locale" value={locale} />
                        <input type="hidden" name="goalId" value={goal.id} />
                        <input type="hidden" name="periodStart" value={start} />
                        <input type="hidden" name="completed" value={checked ? "false" : "true"} />
                        <button className="check-button" type="submit" aria-label={checked ? t("unified.uncheck") : t("unified.check")}>{checked ? "✓" : ""}</button>
                      </form>
                      <div>
                        <strong>{String(goal.title)}</strong>
                        <small>{String(goal.target_value)} {String(goal.unit)} · {t("periods." + String(goal.period))}</small>
                        {(checkIns ?? []).some((item) => item.goal_id === goal.id) ? (
                          <details className="goal-history">
                            <summary>{t("unified.history")}</summary>
                            <div>
                              {(checkIns ?? []).filter((item) => item.goal_id === goal.id).slice(0, 8).map((item) => (
                                <span key={item.period_start}>
                                  <time dateTime={item.period_start}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeZone: "UTC" }).format(new Date(item.period_start + "T12:00:00Z"))}</time>
                                  <b>✓ {new Intl.NumberFormat(locale).format(Number(item.value))}</b>
                                </span>
                              ))}
                            </div>
                          </details>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : <div className="empty-state"><strong>{t("resources.goals.empty")}</strong><p>{t("resources.goals.emptyHint")}</p></div>}
          </section>
        </div>
      ) : null}

      {section === "organize" ? (
        <>
          <div className="organization-toolbar">
            <div><h2>{t("unified.organization")}</h2><p>{t("unified.organizationHint")}</p></div>
            <nav aria-label={t("unified.manageLabel")}>
              {(["categories", "events", "goals"] as const).map((resource) => (
                <Link className={manage === resource ? "button button-primary" : "button button-ghost"} key={resource} href={{ pathname: "/dashboard", query: { section: "organize", manage: resource } }}>
                  {t("nav." + resource)}
                </Link>
              ))}
            </nav>
          </div>
          {!manage ? (
            <section className="organization-tree">
              {categories.filter((category) => !category.parent_id).map((category) => (
                <CategoryBranch key={category.id} category={category} categories={categories} events={events} goals={goals} goalTitles={goalTitles} />
              ))}
              {!categories.length ? <div className="empty-state"><strong>{t("resources.categories.empty")}</strong><p>{t("resources.categories.emptyHint")}</p></div> : null}
            </section>
          ) : (
            <ResourceManager
              locale={locale}
              resource={manage}
              page={managerPage}
              search={query.search}
              categories={categoryOptions}
              events={events.map(({ id, title }) => ({ id, title: String(title) }))}
              goals={goals.map(({ id, title }) => ({ id, title: String(title) }))}
              timezone={timezone}
              media={managerMedia}
              status={query.status}
              error={query.error}
              dialog={{ type: query.dialog === "create" || query.dialog === "edit" ? query.dialog : undefined, id: query.id }}
            />
          )}
        </>
      ) : null}

      {section === "calendar" ? (
        <ResourceManager
          locale={locale}
          resource="schedules"
          page={managerPage}
          categories={categoryOptions}
          events={events.map(({ id, title }) => ({ id, title: String(title) }))}
          goals={goals.map(({ id, title }) => ({ id, title: String(title) }))}
          timezone={timezone}
          media={managerMedia}
          status={query.status}
          error={query.error}
          dialog={{ type: query.dialog === "create" || query.dialog === "edit" ? query.dialog : undefined, id: query.id }}
          scheduleView={calendarView}
          selectedDate={selectedDate}
          scheduleCalendar={
            <ScheduleCalendar
              locale={locale}
              view={calendarView}
              selectedDate={selectedDate}
              startDate={calendarRange.startDate}
              days={calendarRange.days}
              previousDate={calendarRange.previousDate}
              nextDate={calendarRange.nextDate}
              today={today}
              timeZone={timezone}
              occurrences={occurrences}
              events={events.map(({ id, title }) => ({ id, title: String(title) }))}
            />
          }
        />
      ) : null}
    </div>
  );
}
