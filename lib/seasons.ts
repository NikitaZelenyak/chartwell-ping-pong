import { APP_TIME_ZONE } from "@/lib/datetime";

export type Season = {
  id: string;
  name: string;
  starts_at: string;
  ends_at: string;
  status: "active" | "closed";
  closed_at: string | null;
  champion_id: string | null;
  champion_team_id: string | null;
};

export function seasonDate(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE, month: "short", day: "numeric", year: "numeric",
  }).format(new Date(value));
}

export function seasonProgress(season: Season, now = Date.now()) {
  const start = Date.parse(season.starts_at);
  const end = Date.parse(season.ends_at);
  return Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
}

export function nextSeasonName(season: Season) {
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TIME_ZONE, month: "numeric", year: "numeric",
  }).formatToParts(new Date(season.ends_at));
  const month = Number(date.find((part) => part.type === "month")?.value);
  const year = date.find((part) => part.type === "year")?.value;
  return `${month >= 12 || month < 3 ? "Winter" : month < 6 ? "Spring" : month < 9 ? "Summer" : "Autumn"} ${year}`;
}
