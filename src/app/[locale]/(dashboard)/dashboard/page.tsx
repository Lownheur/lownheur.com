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
import { PrivateImage } from "@/components/private-image";
import { ResourceDialog } from "@/components/resource-dialog";
import { ResourceIllustration } from "@/components/resource-illustration";
import {
  ResourceCardDialogs,
  ResourceCreateDialog,
  ResourceManager
} from "@/components/resource-manager";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import {
  buildCategoryOptions,
  getScheduleOccurrencesInRange,
  listResources,
  type CategoryOption,
  type ResourceRecord
} from "@/server/domain/resources";
import { getResourceMediaMap, type MediaView } from "@/server/media";
import {
  setGoalCheckInAction,
  setOccurrenceCompletedAction
} from "./actions";

type Section = "today" | "organize" | "calendar";
type CreatableResource = "categories" | "events" | "goals";
type DashboardQuery = {
  section?: string;
  manage?: string;
  create?: string;
  cursor?: string;
  status?: string;
  error?: string;
  dialog?: string;
  id?: string;
  view?: string;
  date?: string;
};
type EventView = ResourceRecord & {
  categoryPath: string;
  linkedGoalTitles: string[];
};
type Labels = {
  category: string;
  event: string;
  goal: string;
  empty: string;
  item: string;
  items: string;
  statuses: Record<string, string>;
};

function periodStart(goal: ResourceRecord, today: string) {
  if (goal.period === "week") return startOfIsoWeek(today);
  if (goal.period === "month") return today.slice(0, 7) + "-01";
  if (goal.period === "once") return String(goal.created_at).slice(0, 10);
  return today;
}

function EventContext({ event }: { event: EventView | undefined }) {
  if (!event) return null;
  return (
    <div className="event-context-labels">
      {event.categoryPath ? <span className="context-label is-category">{event.categoryPath}</span> : null}
      {event.linkedGoalTitles.map((goal) => (
        <span className="context-label is-goal" key={goal}>◎ {goal}</span>
      ))}
    </div>
  );
}

async function OrganizationResourceCard({
  locale,
  resource,
  row,
  categoryPath,
  goalTitles,
  categories,
  events,
  goals,
  timezone,
  assets,
  labels,
  defaultEditOpen
}: {
  locale: AppLocale;
  resource: "events" | "goals";
  row: ResourceRecord;
  categoryPath: string;
  goalTitles: string[];
  categories: CategoryOption[];
  events: Array<{ id: string; title: string }>;
  goals: Array<{ id: string; title: string }>;
  timezone: string;
  assets: MediaView[];
  labels: Labels;
  defaultEditOpen: boolean;
}) {
  const title = String(row.title);
  const hero = assets[0];
  return (
    <article className={"resource-card organization-resource-card is-" + resource}>
      <div className="resource-card-visual">
        {hero ? <PrivateImage src={hero.url} alt={hero.alt || title} /> : <ResourceIllustration resource={resource} />}
        <span className="resource-type-label">{resource === "events" ? labels.event : labels.goal}</span>
      </div>
      <div className="resource-card-body">
        <div className="resource-card-meta">
          <span>{categoryPath}</span>
          {resource === "goals" ? <span className="status-pill">{labels.statuses[String(row.status)] ?? String(row.status)}</span> : null}
        </div>
        <div className="resource-card-copy">
          <h3>{title}</h3>
          {resource === "goals" ? (
            <strong className="resource-card-metric">{String(row.target_value)} {String(row.unit)}</strong>
          ) : null}
          {resource === "events" && goalTitles.length ? (
            <div className="event-context-labels">
              {goalTitles.map((goal) => <span className="context-label is-goal" key={goal}>◎ {goal}</span>)}
            </div>
          ) : null}
          {row.description ? <p>{String(row.description)}</p> : null}
        </div>
        <ResourceCardDialogs
          locale={locale}
          resource={resource}
          row={row}
          title={title}
          categories={categories}
          events={events}
          goals={goals}
          timezone={timezone}
          assets={assets}
          defaultEditOpen={defaultEditOpen}
        />
      </div>
    </article>
  );
}

async function CategoryBranch({
  locale,
  category,
  categories,
  categoryOptions,
  events,
  goals,
  eventOptions,
  goalOptions,
  categoryPaths,
  timezone,
  categoryMedia,
  eventMedia,
  goalMedia,
  labels,
  editState
}: {
  locale: AppLocale;
  category: ResourceRecord;
  categories: ResourceRecord[];
  categoryOptions: CategoryOption[];
  events: EventView[];
  goals: ResourceRecord[];
  eventOptions: Array<{ id: string; title: string }>;
  goalOptions: Array<{ id: string; title: string }>;
  categoryPaths: Map<string, string>;
  timezone: string;
  categoryMedia: Record<string, MediaView[]>;
  eventMedia: Record<string, MediaView[]>;
  goalMedia: Record<string, MediaView[]>;
  labels: Labels;
  editState: { resource?: string; id?: string };
}) {
  const children = categories.filter((item) => item.parent_id === category.id);
  const directEvents = events.filter((item) => item.category_id === category.id);
  const directGoals = goals.filter((item) => item.category_id === category.id);
  const title = String(category.title);
  const hero = categoryMedia[category.id]?.[0];
  const itemCount = children.length + directEvents.length + directGoals.length;
  return (
    <details className="organization-category-card">
      <summary>
        <div className="organization-category-visual">
          {hero ? <PrivateImage src={hero.url} alt={hero.alt || title} /> : <ResourceIllustration resource="categories" />}
          <span className="resource-type-label">{labels.category}</span>
        </div>
        <div className="organization-category-copy">
          <h2>{title}</h2>
          <p>{itemCount} {itemCount === 1 ? labels.item : labels.items}</p>
          <span className="organization-open-hint" aria-hidden="true">+</span>
        </div>
      </summary>
      <div className="organization-category-content">
        <ResourceCardDialogs
          locale={locale}
          resource="categories"
          row={category}
          title={title}
          categories={categoryOptions}
          events={eventOptions}
          goals={goalOptions}
          timezone={timezone}
          assets={categoryMedia[category.id] ?? []}
          defaultEditOpen={editState.resource === "categories" && editState.id === category.id}
        />
        {children.length ? (
          <section className="organization-subcategories" aria-label={labels.category}>
            {children.map((child) => (
              <CategoryBranch
                key={child.id}
                locale={locale}
                category={child}
                categories={categories}
                categoryOptions={categoryOptions}
                events={events}
                goals={goals}
                eventOptions={eventOptions}
                goalOptions={goalOptions}
                categoryPaths={categoryPaths}
                timezone={timezone}
                categoryMedia={categoryMedia}
                eventMedia={eventMedia}
                goalMedia={goalMedia}
                labels={labels}
                editState={editState}
              />
            ))}
          </section>
        ) : null}
        {directEvents.length || directGoals.length ? (
          <section className="organization-content-grid">
            {directEvents.map((event) => (
              <OrganizationResourceCard
                key={event.id}
                locale={locale}
                resource="events"
                row={event}
                categoryPath={event.categoryPath}
                goalTitles={event.linkedGoalTitles}
                categories={categoryOptions}
                events={eventOptions}
                goals={goalOptions}
                timezone={timezone}
                assets={eventMedia[event.id] ?? []}
                labels={labels}
                defaultEditOpen={editState.resource === "events" && editState.id === event.id}
              />
            ))}
            {directGoals.map((goal) => (
              <OrganizationResourceCard
                key={goal.id}
                locale={locale}
                resource="goals"
                row={goal}
                categoryPath={categoryPaths.get(String(goal.category_id)) ?? ""}
                goalTitles={[]}
                categories={categoryOptions}
                events={eventOptions}
                goals={goalOptions}
                timezone={timezone}
                assets={goalMedia[goal.id] ?? []}
                labels={labels}
                defaultEditOpen={editState.resource === "goals" && editState.id === goal.id}
              />
            ))}
          </section>
        ) : children.length ? null : <p className="organization-empty">{labels.empty}</p>}
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
  const createCandidate = query.create ?? (query.dialog === "create" ? query.manage : undefined);
  const createResource = ["categories", "events", "goals"].includes(createCandidate ?? "")
    ? createCandidate as CreatableResource
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
  const rawEvents = ((eventResult.data ?? []) as unknown as Array<ResourceRecord & {
    event_goals?: Array<{ goal_id: string }>;
  }>).map((event) => ({
    ...event,
    goal_ids: (event.event_goals ?? []).map((link) => link.goal_id)
  } as ResourceRecord));
  const goals = (goalResult.data ?? []) as ResourceRecord[];
  const categoryOptions = buildCategoryOptions(categories);
  const categoryPaths = new Map(categoryOptions.map((item) => [item.id, item.path]));
  const goalTitles = new Map(goals.map((item) => [item.id, String(item.title)]));
  const events: EventView[] = rawEvents.map((event) => ({
    ...event,
    categoryPath: categoryPaths.get(String(event.category_id)) ?? "",
    linkedGoalTitles: Array.isArray(event.goal_ids)
      ? event.goal_ids.map((goalId) => goalTitles.get(String(goalId))).filter((title): title is string => Boolean(title))
      : []
  }));
  const eventById = new Map(events.map((event) => [event.id, event]));
  const eventOptions = events.map(({ id, title }) => ({ id, title: String(title) }));
  const goalOptions = goals.map(({ id, title }) => ({ id, title: String(title) }));
  const timezone = profileResult.data?.timezone ?? "UTC";
  const today = dateInTimeZone(new Date(), timezone);
  const selectedDate = normalizeDateOnly(query.date, timezone);
  const calendarView = query.view === "day" ? "day" : "week";
  const calendarRange = buildCalendarRange(calendarView, selectedDate, timezone);
  const todayRange = buildCalendarRange("day", today, timezone);
  const occurrences = await getScheduleOccurrencesInRange(client, {
    from: section === "today" ? todayRange.from : calendarRange.from,
    to: section === "today" ? todayRange.to : calendarRange.to
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

  let schedulePage = { items: [] as ResourceRecord[], nextCursor: null as string | null };
  let scheduleMedia: Record<string, MediaView[]> = {};
  let categoryMedia: Record<string, MediaView[]> = {};
  let eventMedia: Record<string, MediaView[]> = {};
  let goalMedia: Record<string, MediaView[]> = {};
  if (section === "calendar") {
    schedulePage = await listResources(client, user.id, "schedules", { limit: 20, cursor: query.cursor });
    scheduleMedia = await getResourceMediaMap(client, user.id, "schedules", schedulePage.items);
  }
  if (section === "organize") {
    [categoryMedia, eventMedia, goalMedia] = await Promise.all([
      getResourceMediaMap(client, user.id, "categories", categories),
      getResourceMediaMap(client, user.id, "events", events),
      getResourceMediaMap(client, user.id, "goals", goals)
    ]);
  }
  const labels: Labels = {
    category: t("resources.categories.singular"),
    event: t("resources.events.singular"),
    goal: t("resources.goals.singular"),
    empty: t("unified.emptyCategory"),
    item: t("unified.item"),
    items: t("unified.items"),
    statuses: {
      todo: t("statuses.todo"),
      in_progress: t("statuses.in_progress"),
      achieved: t("statuses.achieved"),
      abandoned: t("statuses.abandoned")
    }
  };

  return (
    <div className="dashboard-page unified-dashboard">
      {section === "today" ? (
        <div className="today-layout">
          <section className="dashboard-panel">
            <div className="panel-heading"><div><h2>{t("unified.todayEvents")}</h2><p>{t("unified.todayEventsHint")}</p></div></div>
            {occurrences.length ? (
              <ul className="check-list">
                {occurrences.map((occurrence) => {
                  const event = eventById.get(occurrence.eventId);
                  return (
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
                        <strong>{event?.title ? String(event.title) : t("calendar.unknownTarget")}</strong>
                        <time dateTime={occurrence.startsAt}>{new Intl.DateTimeFormat(locale, { hour: "2-digit", minute: "2-digit", timeZone: timezone }).format(new Date(occurrence.startsAt))}</time>
                        <EventContext event={event} />
                      </div>
                    </li>
                  );
                })}
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
                        {categoryPaths.get(String(goal.category_id)) ? (
                          <div className="event-context-labels">
                            <span className="context-label is-category">{categoryPaths.get(String(goal.category_id))}</span>
                          </div>
                        ) : null}
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
          {query.status ? <p className="form-notice form-success" role="status">{t("status." + query.status)}</p> : null}
          <div className="organization-toolbar">
            <div><h1>{t("unified.organization")}</h1><p>{t("unified.organizationHint")}</p></div>
            <ResourceDialog
              triggerLabel={t("actions.add")}
              title={t("unified.addTitle")}
              description={t("unified.addHint")}
              triggerClassName="button button-primary organization-add-button"
              icon="plus"
              closeLabel={t("actions.close")}
            >
              <div className="organization-create-choices">
                {(["categories", "events", "goals"] as const).map((resource) => (
                  <Link key={resource} href={{ pathname: "/dashboard", query: { section: "organize", create: resource } }}>
                    <ResourceIllustration resource={resource} />
                    <strong>{t("nav." + resource)}</strong>
                    <span>{t("resources." + resource + ".description")}</span>
                  </Link>
                ))}
              </div>
            </ResourceDialog>
          </div>
          {createResource ? (
            <ResourceCreateDialog
              locale={locale}
              resource={createResource}
              categories={categoryOptions}
              events={eventOptions}
              goals={goalOptions}
              timezone={timezone}
              defaultOpen
              triggerClassName="sr-only"
              error={query.error}
            />
          ) : null}
          <section className="organization-card-grid">
            {categories.filter((category) => !category.parent_id).map((category) => (
              <CategoryBranch
                key={category.id}
                locale={locale}
                category={category}
                categories={categories}
                categoryOptions={categoryOptions}
                events={events}
                goals={goals}
                eventOptions={eventOptions}
                goalOptions={goalOptions}
                categoryPaths={categoryPaths}
                timezone={timezone}
                categoryMedia={categoryMedia}
                eventMedia={eventMedia}
                goalMedia={goalMedia}
                labels={labels}
                editState={{ resource: query.dialog === "edit" ? query.manage : undefined, id: query.id }}
              />
            ))}
            {!categories.length ? <div className="empty-state"><strong>{t("resources.categories.empty")}</strong><p>{t("resources.categories.emptyHint")}</p></div> : null}
          </section>
        </>
      ) : null}

      {section === "calendar" ? (
        <ResourceManager
          locale={locale}
          resource="schedules"
          page={schedulePage}
          categories={categoryOptions}
          events={eventOptions}
          goals={goalOptions}
          timezone={timezone}
          media={scheduleMedia}
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
              events={events.map((event) => ({
                id: event.id,
                title: String(event.title),
                categoryPath: event.categoryPath,
                goalTitles: event.linkedGoalTitles
              }))}
            />
          }
        />
      ) : null}
    </div>
  );
}
