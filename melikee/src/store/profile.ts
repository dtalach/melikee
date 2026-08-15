/**
 * Who the app thinks you are.
 *
 * This used to be a frozen object in the seed file called `me`, which meant
 * every person who opened MeLikee was Maya, with Maya's handle, Maya's public
 * link and Maya's birthday. It is now real state: made during onboarding,
 * persisted, and editable in principle.
 *
 * The birthday is stored as a month and a day rather than as "Oct 14" and a
 * frozen "71 days". A countdown written down once is wrong the next morning,
 * and this one is on the camera screen where it is the first thing you see.
 */
import type { Profile } from '@/store/types';

export const MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
] as const;

/** Maya, kept for demo mode — the fixture the design review was written against. */
export const demoProfile: Profile = {
  name: 'Maya',
  initial: 'M',
  handle: '@mayalikes',
  slug: 'maya',
  birthdayMonth: 9,
  birthdayDay: 14,
  /** Taste tags inferred from your shinies (turn 10a) — fixture, for now. */
  tasteTags: ['SNEAKERHEAD', 'AUDIO NERD', 'COZY CORE'],
  reactionsReceived: 23,
  dibsCalled: 3,
  mostLovedShiny: { name: 'On Cloudmonster 2', fires: 9 },
};

/**
 * Builds a profile from the one thing onboarding insists on — a name — plus a
 * birthday if they gave one. Everything else starts at zero, because it is a
 * new account and pretending otherwise is how you get "8 shinies" on an empty
 * list.
 */
export function makeProfile(name: string, birthday?: { month: number; day: number }): Profile {
  const clean = name.trim().replace(/\s+/g, ' ');
  const first = clean.split(' ')[0] || 'You';
  const slug = slugify(first);

  return {
    name: first,
    initial: first.charAt(0).toUpperCase(),
    handle: `@${slug}`,
    slug,
    birthdayMonth: birthday?.month,
    birthdayDay: birthday?.day,
    reactionsReceived: 0,
    dibsCalled: 0,
  };
}

/**
 * Handles are the public half of the account, so they get the conservative
 * treatment: lowercase, letters and digits only, never empty.
 */
function slugify(name: string): string {
  const slug = name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]/g, '');
  return slug || 'you';
}

/** "Oct 14", or nothing if they skipped it. */
export function birthdayLabel(profile: Profile): string | undefined {
  if (profile.birthdayMonth == null || profile.birthdayDay == null) return undefined;
  return `${MONTHS[profile.birthdayMonth]} ${profile.birthdayDay}`;
}

/** How many sleeps. Recomputed on every read, so it is never yesterday's answer. */
export function daysUntilBirthday(profile: Profile): number | undefined {
  const { birthdayMonth: month, birthdayDay: day } = profile;
  if (month == null || day == null) return undefined;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let next = new Date(today.getFullYear(), month, day);
  if (next.getTime() < today.getTime()) next = new Date(today.getFullYear() + 1, month, day);

  return Math.round((next.getTime() - today.getTime()) / 86_400_000);
}

/** The public page a non-user opens — the viral hook. */
export function profileLink(profile: Profile): string {
  return `melikee.app/${profile.slug}`;
}

/** How many days a month has, so 31 February can't be picked. */
export function daysInMonth(month: number): number {
  return [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month] ?? 31;
}
