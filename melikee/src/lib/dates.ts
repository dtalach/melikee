/**
 * Calendar rules from the Rules Spec. The prototype pinned "today" to
 * Aug 5, 2026; here it is the real date.
 */
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'] as const;
export type Month = (typeof MONTHS)[number];
export const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1));

export type MonthDay = { month: Month; day: number };

const DAY_MS = 86_400_000;

function startOfToday(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Days from today to the next occurrence of month/day (0 = today). */
export function daysUntil({ month, day }: MonthDay, now = new Date()): number {
  const today = startOfToday(now);
  const mi = MONTHS.indexOf(month);
  let next = new Date(today.getFullYear(), mi, day);
  if (next < today) next = new Date(today.getFullYear() + 1, mi, day);
  return Math.round((next.getTime() - today.getTime()) / DAY_MS);
}

/** Days since the most recent occurrence of month/day (0 = today). */
export function daysSince({ month, day }: MonthDay, now = new Date()): number {
  const today = startOfToday(now);
  const mi = MONTHS.indexOf(month);
  let last = new Date(today.getFullYear(), mi, day);
  if (last > today) last = new Date(today.getFullYear() - 1, mi, day);
  return Math.round((today.getTime() - last.getTime()) / DAY_MS);
}

/** Month/day a given number of days from today — used to seed sample friends. */
export function inDays(n: number, now = new Date()): MonthDay {
  const d = new Date(startOfToday(now).getTime() + n * DAY_MS);
  return { month: MONTHS[d.getMonth()], day: d.getDate() };
}

export function label({ month, day }: MonthDay) {
  return `${month} ${day}`;
}

/** Age in whole years today. */
export function ageOn({ month, day, year }: MonthDay & { year: number }, now = new Date()): number {
  const mi = MONTHS.indexOf(month);
  const hadThisYear = now.getMonth() > mi || (now.getMonth() === mi && now.getDate() >= day);
  return now.getFullYear() - year - (hadThisYear ? 0 : 1);
}

/** Within this many days, a friend gets the pink ring and sorts first. */
export const SOON_DAYS = 14;

export function shortDate(ts: number) {
  const d = new Date(ts);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "now", "5h", "2d" — the prototype's compact relative times. */
export function ago(ts: number, now = Date.now()) {
  const mins = Math.max(0, Math.round((now - ts) / 60_000));
  if (mins < 60) return 'now';
  const hours = Math.round(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.round(days / 7)}w`;
}

/** "Mar 4" → { month: 'Mar', day: 4 }; null if it isn't one. */
export function parseLabel(s?: string | null): MonthDay | null {
  const m = /^([A-Z][a-z]{2}) (\d{1,2})$/.exec((s ?? '').trim());
  if (!m || !(MONTHS as readonly string[]).includes(m[1])) return null;
  const day = Number(m[2]);
  return day >= 1 && day <= 31 ? { month: m[1] as Month, day } : null;
}
