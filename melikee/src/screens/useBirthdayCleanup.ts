import { daysSince } from '@/lib/dates';
import { useApp } from '@/store/useApp';

/** How long after the birthday the "Got it / Still want" sort stays offered. */
const WINDOW_DAYS = 14;

/**
 * Spec: the day after a dated list's date, prompt "Got it / Still want" per
 * shiny. Returns the birthday list while that's due and not yet done this year.
 */
export function useBirthdayCleanup() {
  const birthday = useApp((s) => s.profile.birthday);
  const cleanupYear = useApp((s) => s.cleanupYear);
  const list = useApp((s) => s.lists.find((l) => l.isBirthday && !l.archived));
  const count = useApp((s) => (list ? s.items.filter((i) => i.list === list.id).length : 0));
  const since = daysSince(birthday);
  const due = since >= 1 && since <= WINDOW_DAYS && cleanupYear !== new Date().getFullYear();
  return due && list && count ? list : null;
}
