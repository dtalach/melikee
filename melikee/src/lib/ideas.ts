/**
 * Gift inspiration, app side: turn what the app already knows into taste
 * signals and ask /api/ideas. Only first-party, in-app signals: the person's
 * lists, sizes, age band, upcoming occasions, what they've searched for here,
 * and how they've reacted to earlier ideas. Never anything from other apps or
 * sites, and never their name, phone number or handle.
 */
import { ageOn, daysUntil } from './dates';
import type { Budget, IdeasRequest, IdeasResponse, TasteSignals } from './ideasContract';
import { apiBase } from './match';
import { sizeParts } from './sizes';
import type { Item, Profile, WishList } from '@/store/types';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export type IdeaFeedback = { liked: string[]; disliked: string[] };

export function ageBand(p: Profile): TasteSignals['ageBand'] {
  if (p.birthdaySet === false) return undefined;
  const age = ageOn(p.birthday);
  return age < 16 ? '13-15' : age < 18 ? '16-17' : age < 25 ? '18-24' : '25+';
}

function region() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const lang = typeof navigator !== 'undefined' ? navigator.language : undefined;
    return [lang, tz].filter(Boolean).join(' · ') || undefined;
  } catch {
    return undefined;
  }
}

export function buildSignals(s: { profile: Profile; lists: WishList[]; items: Item[]; recentQueries: string[]; ideaFeedback: IdeaFeedback }, budget: Budget, seen: string[]): TasteSignals {
  const listName = (id: string) => s.lists.find((l) => l.id === id)?.name;
  const live = s.lists.filter((l) => !l.archived);
  const occasions: TasteSignals['occasions'] = [];
  if (s.profile.birthdaySet !== false) occasions.push({ name: 'their birthday', days: daysUntil(s.profile.birthday) });
  for (const l of live) if (l.date && !l.isBirthday) occasions.push({ name: l.name, days: daysUntil(l.date) });
  return {
    ageBand: ageBand(s.profile),
    region: region(),
    month: MONTH_NAMES[new Date().getMonth()],
    occasions: occasions.filter((o) => o.days <= 120).sort((a, b) => a.days - b.days),
    sizes: sizeParts(s.profile.sizes),
    budget,
    wants: [...s.items]
      .filter((i) => !i.pending || i.query)
      .sort((a, b) => Number(!!b.star) - Number(!!a.star) || (b.createdAt ?? 0) - (a.createdAt ?? 0))
      .slice(0, 30)
      .map((i) => ({ name: i.pending ? (i.query ?? i.name) : i.name, store: i.pending ? undefined : i.store, price: i.price !== '—' ? i.price : undefined, list: listName(i.list), star: i.star || undefined })),
    searches: s.recentQueries.slice(0, 10),
    liked: s.ideaFeedback.liked.slice(0, 25),
    disliked: s.ideaFeedback.disliked.slice(0, 40),
    seen: seen.slice(-80),
  };
}

export async function fetchIdeas(secret: string, signals: TasteSignals, count = 8): Promise<IdeasResponse> {
  try {
    const res = await fetch(`${apiBase()}/api/ideas`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ secret, signals, count } satisfies IdeasRequest) });
    const json = (await res.json().catch(() => null)) as IdeasResponse | null;
    return json ?? { ok: false, code: 'upstream', message: `Ideas answered ${res.status}.` };
  } catch {
    return { ok: false, code: 'upstream', message: 'Couldn’t reach MeLikee. Check your connection.' };
  }
}
