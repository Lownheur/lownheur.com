import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { ResourceManager } from "@/components/resource-manager";
import { ScheduleCalendar } from "@/components/schedule-calendar";
import {
  buildCalendarRange,
  dateInTimeZone,
  normalizeDateOnly,
  type CalendarView
} from "@/lib/calendar";
import {
  buildCategoryOptions,
  getScheduleOccurrencesInRange,
  listResources,
  resourceNames,
  type ResourceName,
  type ResourcePage,
  type ResourceRecord
} from "@/server/domain/resources";
import { getResourceMediaMap } from "@/server/media";

function isResource(value: string): value is ResourceName {
  return resourceNames.includes(value as ResourceName);
}

export default async function ResourcePage({
  params,
  searchParams
}: {
  params: Promise<{ locale: AppLocale; resource: string }>;
  searchParams: Promise<{ cursor?: string; search?: string; status?: string; error?: string; dialog?: string; id?: string; view?: string; date?: string }>;
}) {
  const [{ locale, resource }, query] = await Promise.all([params, searchParams]);
  if (!isResource(resource)) notFound();
  const [t, user, client] = await Promise.all([
    getTranslations({ locale, namespace: "Dashboard" }),
    requireUser(locale),
    createSupabaseServerClient()
  ]);
  const [categories, events, goals, profile] = await Promise.all([
    client.from("categories").select("*").eq("user_id", user.id).order("title"),
    client.from("events").select("id,title").eq("user_id", user.id).order("title"),
    client.from("goals").select("id,title").eq("user_id", user.id).order("title"),
    client.from("profiles").select("timezone").eq("user_id", user.id).maybeSingle()
  ]);
  const categoryRows = (categories.data ?? []) as ResourceRecord[];
  const categoryOptions = buildCategoryOptions(categoryRows);
  const timezone = profile.data?.timezone ?? "UTC";
  const requestedView: CalendarView = query.view === "day" || query.view === "week" ? query.view : "list";
  const scheduleView: CalendarView = resource === "schedules" ? requestedView : "list";
  const selectedDate = normalizeDateOnly(query.date, timezone);
  let page: ResourcePage;
  if (resource === "categories") {
    const byId = new Map(categoryRows.map((row) => [row.id, row]));
    const normalizedSearch = query.search?.trim().toLocaleLowerCase(locale);
    const items = categoryOptions
      .filter((category) => !normalizedSearch || category.path.toLocaleLowerCase(locale).includes(normalizedSearch))
      .map((category) => byId.get(category.id))
      .filter((row): row is ResourceRecord => Boolean(row));
    page = { items, nextCursor: null };
  } else {
    page = await listResources(client, user.id, resource, {
      limit: 20,
      cursor: query.cursor,
      search: resource === "schedules" ? undefined : query.search
    });
  }

  const media = await getResourceMediaMap(client, user.id, resource, page.items);
  let scheduleCalendar = null;
  if (resource === "schedules" && scheduleView !== "list") {
    const range = buildCalendarRange(scheduleView, selectedDate, timezone);
    const occurrences = await getScheduleOccurrencesInRange(client, {
      from: range.from,
      to: range.to
    });
    scheduleCalendar = <ScheduleCalendar
      locale={locale}
      view={scheduleView}
      selectedDate={selectedDate}
      startDate={range.startDate}
      days={range.days}
      previousDate={range.previousDate}
      nextDate={range.nextDate}
      today={dateInTimeZone(new Date(), timezone)}
      timeZone={timezone}
      occurrences={occurrences}
      events={events.data ?? []}
      goals={goals.data ?? []}
    />;
  }

  return <div className="dashboard-page">
    <header className="dashboard-heading"><div><span className="eyebrow">{t("resources.eyebrow")}</span><h1>{t("resources." + resource + ".title")}</h1></div><p>{t("resources." + resource + ".description")}</p></header>
    <ResourceManager
      locale={locale}
      resource={resource}
      page={page}
      search={query.search}
      categories={categoryOptions}
      events={events.data ?? []}
      goals={goals.data ?? []}
      timezone={timezone}
      media={media}
      status={query.status}
      error={query.error}
      dialog={{
        type: query.dialog === "create" || query.dialog === "edit" ? query.dialog : undefined,
        id: query.id
      }}
      scheduleView={scheduleView}
      selectedDate={selectedDate}
      scheduleCalendar={scheduleCalendar}
    />
  </div>;
}
