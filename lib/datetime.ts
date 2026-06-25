export const APP_TIME_ZONE = "America/Toronto";

function parseDateTimeLocal(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/,
  );

  if (!match) {
    return null;
  }

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: Number(match[4]),
    minute: Number(match[5]),
    second: Number(match[6] ?? 0),
  };
}

function timeZoneOffsetMs(utcMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(utcMs));

  const value = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);

  const localAsUtcMs = Date.UTC(
    value("year"),
    value("month") - 1,
    value("day"),
    value("hour"),
    value("minute"),
    value("second"),
  );

  return localAsUtcMs - utcMs;
}

export function dateTimeLocalToIso(
  value: string | null,
  timeZone = APP_TIME_ZONE,
) {
  if (!value) {
    return null;
  }

  const parsed = parseDateTimeLocal(value);

  if (!parsed) {
    return value;
  }

  const wallClockAsUtcMs = Date.UTC(
    parsed.year,
    parsed.month - 1,
    parsed.day,
    parsed.hour,
    parsed.minute,
    parsed.second,
  );

  let utcMs = wallClockAsUtcMs - timeZoneOffsetMs(wallClockAsUtcMs, timeZone);
  utcMs = wallClockAsUtcMs - timeZoneOffsetMs(utcMs, timeZone);

  return new Date(utcMs).toISOString();
}

export function isoToDateTimeLocal(value: string | null, timeZone = APP_TIME_ZONE) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const part = (type: string) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";

  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}
