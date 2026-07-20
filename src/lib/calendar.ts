export type CalendarView = "list" | "day" | "week";

const dateOnlyPattern = /^\d{4}-\d{2}-\d{2}$/;

function dateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23"
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value);
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second")
  };
}

export function dateInTimeZone(date: Date, timeZone: string) {
  const parts = dateParts(date, timeZone);
  return [parts.year, parts.month, parts.day]
    .map((part, index) => String(part).padStart(index ? 2 : 4, "0"))
    .join("-");
}

export function normalizeDateOnly(value: string | undefined, timeZone: string) {
  if (value && dateOnlyPattern.test(value)) {
    const parsed = new Date(value + "T00:00:00Z");
    if (!Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value) return value;
  }
  return dateInTimeZone(new Date(), timeZone);
}

export function addCalendarDays(value: string, days: number) {
  const date = new Date(value + "T00:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function startOfIsoWeek(value: string) {
  const date = new Date(value + "T00:00:00Z");
  const isoDay = date.getUTCDay() || 7;
  return addCalendarDays(value, 1 - isoDay);
}

export function localMidnightToIso(value: string, timeZone: string) {
  const [year, month, day] = value.split("-").map(Number);
  const desired = Date.UTC(year, month - 1, day);
  let instant = desired;
  for (let iteration = 0; iteration < 4; iteration += 1) {
    const actual = dateParts(new Date(instant), timeZone);
    const represented = Date.UTC(
      actual.year,
      actual.month - 1,
      actual.day,
      actual.hour,
      actual.minute,
      actual.second
    );
    const next = instant + desired - represented;
    if (next === instant) break;
    instant = next;
  }
  return new Date(instant).toISOString();
}

export function buildCalendarRange(view: Exclude<CalendarView, "list">, selectedDate: string, timeZone: string) {
  const startDate = view === "week" ? startOfIsoWeek(selectedDate) : selectedDate;
  const dayCount = view === "week" ? 7 : 1;
  const endDate = addCalendarDays(startDate, dayCount);
  return {
    from: localMidnightToIso(startDate, timeZone),
    to: localMidnightToIso(endDate, timeZone),
    startDate,
    endDate,
    days: Array.from({ length: dayCount }, (_, index) => addCalendarDays(startDate, index)),
    previousDate: addCalendarDays(selectedDate, -dayCount),
    nextDate: addCalendarDays(selectedDate, dayCount)
  };
}
