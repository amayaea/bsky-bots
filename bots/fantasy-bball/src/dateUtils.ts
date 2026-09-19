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

export function isMondayEt(now: Date = new Date()): boolean {
  return (
    new Intl.DateTimeFormat("en-US", { timeZone: ET_TIMEZONE, weekday: "short" }).format(now) ===
    "Mon"
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
  return getUpcomingDaysYmdEt(1, now)[0];
}

/**
 * Next `count` calendar days after the current Eastern "today" (YYYY-MM-DD).
 * e.g. count=2 → tomorrow and the day after.
 */
export function getUpcomingDaysYmdEt(count: number, now: Date = new Date()): string[] {
  const { year, month, day } = getCalendarPartsEt(now);
  const todayYmd = ymdFromParts(year, month, day);
  const out: string[] = [];
  for (let i = 1; i <= count; i++) {
    out.push(addCalendarDaysYmd(todayYmd, i));
  }
  return out;
}

/**
 * Returns the Monday-through-Sunday range for the fantasy week.
 * If Sunday: Returns tomorrow (Monday) through next Sunday.
 * If Monday: Returns today (Monday) through this Sunday.
 */
export function getUpcomingFantasyWeekEt(now: Date = new Date()): string[] {
  const { year, month, day } = getCalendarPartsEt(now);
  const todayYmd = ymdFromParts(year, month, day);

  let mondayYmd: string;
  if (isSundayEt(now)) {
    mondayYmd = addCalendarDaysYmd(todayYmd, 1);
  } else if (isMondayEt(now)) {
    mondayYmd = todayYmd;
  } else {
    // Fallback: find the most recent Monday
    const weekday = new Intl.DateTimeFormat("en-US", {
      timeZone: ET_TIMEZONE,
      weekday: "long",
    }).format(now);
    const daysSinceMonday: Record<string, number> = {
      Monday: 0,
      Tuesday: 1,
      Wednesday: 2,
      Thursday: 3,
      Friday: 4,
      Saturday: 5,
      Sunday: 6,
    };
    mondayYmd = addCalendarDaysYmd(todayYmd, -daysSinceMonday[weekday]);
  }

  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    out.push(addCalendarDaysYmd(mondayYmd, i));
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
