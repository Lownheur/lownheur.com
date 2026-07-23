import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { addCalendarDays, dateInTimeZone, type CalendarView } from "@/lib/calendar";
import type { ScheduleOccurrence } from "@/server/domain/resources";
import { setOccurrenceCompletedAction } from "@/app/[locale]/(dashboard)/dashboard/actions";

type Target = {
  id: string;
  title: string;
  categoryPath: string;
  goalTitles: string[];
};

export async function ScheduleViewSwitcher({
  locale,
  view,
  selectedDate
}: {
  locale: AppLocale;
  view: CalendarView;
  selectedDate: string;
}) {
  const t = await getTranslations({ locale, namespace: "Dashboard.calendar" });
  return (
    <nav className="calendar-view-switch" aria-label={t("viewLabel")}>
      {(["day", "week"] as const).map((candidate) => (
        <Link
          key={candidate}
          className={candidate === view ? "is-active" : undefined}
          aria-current={candidate === view ? "page" : undefined}
          href={{ pathname: "/dashboard", query: { section: "calendar", view: candidate, date: selectedDate } }}
        >
          {t("views." + candidate)}
        </Link>
      ))}
    </nav>
  );
}

export async function ScheduleCalendar({
  locale,
  view,
  selectedDate,
  startDate,
  days,
  previousDate,
  nextDate,
  today,
  timeZone,
  occurrences,
  events
}: {
  locale: AppLocale;
  view: Exclude<CalendarView, "list">;
  selectedDate: string;
  startDate: string;
  days: string[];
  previousDate: string;
  nextDate: string;
  today: string;
  timeZone: string;
  occurrences: ScheduleOccurrence[];
  events: Target[];
}) {
  const t = await getTranslations({ locale, namespace: "Dashboard.calendar" });
  const eventById = new Map(events.map((item) => [item.id, item]));
  const byDay = new Map(days.map((day) => [day, [] as ScheduleOccurrence[]]));
  for (const occurrence of occurrences) {
    byDay.get(dateInTimeZone(new Date(occurrence.startsAt), timeZone))?.push(occurrence);
  }
  const dayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC"
  });
  const longDayFormatter = new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  });
  const timeFormatter = new Intl.DateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    timeZone
  });
  const rangeEnd = addCalendarDays(startDate, days.length - 1);
  const title = view === "day"
    ? longDayFormatter.format(new Date(startDate + "T12:00:00Z"))
    : t("weekTitle", {
        from: dayFormatter.format(new Date(startDate + "T12:00:00Z")),
        to: dayFormatter.format(new Date(rangeEnd + "T12:00:00Z"))
      });

  return (
    <section className="schedule-calendar" aria-labelledby="calendar-title">
      <header className="calendar-controls">
        <div className="calendar-period-controls">
          <Link className="button button-ghost calendar-arrow" href={{ pathname: "/dashboard", query: { section: "calendar", view, date: previousDate } }} aria-label={t("previous")}>←</Link>
          <Link className="button button-ghost" href={{ pathname: "/dashboard", query: { section: "calendar", view, date: today } }}>{t("today")}</Link>
          <Link className="button button-ghost calendar-arrow" href={{ pathname: "/dashboard", query: { section: "calendar", view, date: nextDate } }} aria-label={t("next")}>→</Link>
        </div>
        <h2 id="calendar-title">{title}</h2>
        <form className="calendar-date-form" method="get">
          <input type="hidden" name="section" value="calendar" />
          <input type="hidden" name="view" value={view} />
          <label className="sr-only" htmlFor="calendar-date">{t("chooseDate")}</label>
          <input id="calendar-date" className="form-input" type="date" name="date" defaultValue={selectedDate} />
          <button className="button button-ghost" type="submit">{t("go")}</button>
        </form>
      </header>

      <div className={"calendar-grid calendar-grid-" + view}>
        {days.map((day) => {
          const items = byDay.get(day) ?? [];
          const isToday = day === today;
          return (
            <section className={isToday ? "calendar-day is-today" : "calendar-day"} key={day}>
              <header className="calendar-day-heading">
                <time dateTime={day}>{dayFormatter.format(new Date(day + "T12:00:00Z"))}</time>
                {isToday ? <span>{t("today")}</span> : null}
              </header>
              <div className="calendar-day-items">
                {items.length ? items.map((occurrence) => {
                  const event = eventById.get(occurrence.eventId);
                  return (
                    <article className={occurrence.completedAt ? "calendar-item is-event is-completed" : "calendar-item is-event"} key={occurrence.scheduleId + occurrence.startsAt}>
                      <div className="calendar-item-time">
                        <time dateTime={occurrence.startsAt}>{timeFormatter.format(new Date(occurrence.startsAt))}</time>
                        {occurrence.endsAt ? <span>– {timeFormatter.format(new Date(occurrence.endsAt))}</span> : null}
                      </div>
                      <strong>{event?.title ?? t("unknownTarget")}</strong>
                      {event ? (
                        <div className="event-context-labels calendar-context-labels">
                          {event.categoryPath ? <span className="context-label is-category">{event.categoryPath}</span> : null}
                          {event.goalTitles.map((goal) => (
                            <span className="context-label is-goal" key={goal}>◎ {goal}</span>
                          ))}
                        </div>
                      ) : null}
                      <div className="calendar-item-meta">
                        <form action={setOccurrenceCompletedAction}>
                          <input type="hidden" name="locale" value={locale} />
                          <input type="hidden" name="scheduleId" value={occurrence.scheduleId} />
                          <input type="hidden" name="occurrenceStartsAt" value={occurrence.startsAt} />
                          <input type="hidden" name="completed" value={occurrence.completedAt ? "false" : "true"} />
                          <button className="calendar-check" type="submit">
                            {occurrence.completedAt ? "✓ " + t("completed") : t("complete")}
                          </button>
                        </form>
                        {occurrence.recurrence !== "none" ? <span aria-label={t("recurring")}>↻</span> : null}
                      </div>
                    </article>
                  );
                }) : <p className="calendar-day-empty">{t("empty")}</p>}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
}
