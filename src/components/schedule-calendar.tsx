import { getTranslations } from "next-intl/server";
import type { AppLocale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  addCalendarDays,
  dateInTimeZone,
  type CalendarView
} from "@/lib/calendar";
import type { ScheduleOccurrence } from "@/server/domain/resources";

type Target = { id: string; title: string };

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
      {(["list", "day", "week"] as const).map((candidate) => (
        <Link
          key={candidate}
          className={candidate === view ? "is-active" : undefined}
          aria-current={candidate === view ? "page" : undefined}
          href={{
            pathname: "/dashboard/schedules",
            query: candidate === "list" ? {} : { view: candidate, date: selectedDate }
          }}
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
  events,
  goals
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
  goals: Target[];
}) {
  const t = await getTranslations({ locale, namespace: "Dashboard.calendar" });
  const eventTitles = new Map(events.map((item) => [item.id, item.title]));
  const goalTitles = new Map(goals.map((item) => [item.id, item.title]));
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
          <Link className="button button-ghost calendar-arrow" href={{ pathname: "/dashboard/schedules", query: { view, date: previousDate } }} aria-label={t("previous")}>
            <span aria-hidden="true">←</span>
          </Link>
          <Link className="button button-ghost" href={{ pathname: "/dashboard/schedules", query: { view, date: today } }}>
            {t("today")}
          </Link>
          <Link className="button button-ghost calendar-arrow" href={{ pathname: "/dashboard/schedules", query: { view, date: nextDate } }} aria-label={t("next")}>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
        <h2 id="calendar-title">{title}</h2>
        <form className="calendar-date-form" method="get">
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
                  const isEvent = Boolean(occurrence.eventId);
                  const title = isEvent
                    ? eventTitles.get(occurrence.eventId ?? "")
                    : goalTitles.get(occurrence.goalId ?? "");
                  return (
                    <article className={isEvent ? "calendar-item is-event" : "calendar-item is-goal"} key={occurrence.scheduleId + occurrence.startsAt}>
                      <div className="calendar-item-time">
                        <time dateTime={occurrence.startsAt}>{timeFormatter.format(new Date(occurrence.startsAt))}</time>
                        {occurrence.endsAt ? <span>– {timeFormatter.format(new Date(occurrence.endsAt))}</span> : null}
                      </div>
                      <strong>{title ?? t("unknownTarget")}</strong>
                      <div className="calendar-item-meta">
                        <span>{isEvent ? t("event") : t("goal")}</span>
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
