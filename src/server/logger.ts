type LogLevel = "info" | "warn" | "error";

type LogContext = Record<
  string,
  string | number | boolean | null | undefined
>;

export function logEvent(
  level: LogLevel,
  event: string,
  context: LogContext = {}
) {
  const entry = JSON.stringify({
    timestamp: new Date().toISOString(),
    level,
    event,
    ...context
  });
  if (level === "error") {
    console.error(entry);
  } else if (level === "warn") {
    console.warn(entry);
  } else {
    console.info(entry);
  }
}