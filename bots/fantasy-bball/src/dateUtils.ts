/** Calendar logic in US Eastern Time (MLB / SportsDataIO convention). */
export const ET_TIMEZONE = "America/New_York";

export function getCalendarPartsEt(now: Date): { year: number; month: number; day: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TIMEZONE,
    year: "numeric",
    month: "numeric",
    day: "numeric",
  });
  const parts = fmt.formatToParts(now);
  const year = Number(parts.find((p) => p.type === "year")?.value);
  const month = Number(parts.find((p) => p.type === "month")?.value);
  const day = Number(parts.find((p) => p.type === "day")?.value);
  return { year, month, day };
}

export function isSundayEt(now: Date = new Date()): boolean {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: ET_TIMEZONE, weekday: "short" }).format(now) ===
    "Sun"
  );
}

/** YYYY-MM-DD from civil calendar parts (no timezone offset; pure date math). */
export function ymdFromParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Add calendar days in the civil sense (UTC date arithmetic). */
export function addCalendarDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const u = new Date(Date.UTC(y, m - 1, d + deltaDays));
  return ymdFromParts(u.getUTCFullYear(), u.getUTCMonth() + 1, u.getUTCDate());
}

/** Next calendar day after the current Eastern "today". */
export function getTomorrowYmdEt(now: Date = new Date()): string {
  const { year, month, day } = getCalendarPartsEt(now);
  const todayYmd = ymdFromParts(year, month, day);
  return addCalendarDaysYmd(todayYmd, 1);
}

/**
 * When the job runs on Sunday ET, the "upcoming fantasy week" for two-start detection is
 * Monday through Sunday immediately following that Sunday (7 days).
 */
export function getMondayThroughSundayAfterThisSundayEt(now: Date = new Date()): string[] {
  const { year, month, day } = getCalendarPartsEt(now);
  const todayYmd = ymdFromParts(year, month, day);
  const mondayYmd = addCalendarDaysYmd(todayYmd, 1);
  const [sy, sm, sd] = mondayYmd.split("-").map(Number);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    out.push(addCalendarDaysYmd(ymdFromParts(sy, sm, sd), i));
  }
  return out;
}

/** Get shortened day of week (e.g. "Mon") for a YYYY-MM-DD string in ET. */
export function getShortDayOfWeekEt(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  // Date.UTC uses 0-indexed months
  const date = new Date(Date.UTC(y, m - 1, d, 12)); // Noon UTC to stay on the same calendar day
  return new Intl.DateTimeFormat("en-US", {
    timeZone: ET_TIMEZONE,
    weekday: "short",
  }).format(date);
}
