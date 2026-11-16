/**
 * Shared lists, app side: publishing your Friends + link lists, reading
 * someone else's page, and calling dibs. See `server/pages.ts`.
 */
import { MONTHS } from './dates';
import { slug } from './links';
import { apiBase } from './match';
import type { DibsRequest, DibsResponse, PageResponse, PublicList, PublishRequest, PublishResponse } from './pagesContract';
import type { Item, Profile, WishList } from '@/store/types';

const DAY = 86_400_000;

/**
 * When a list's link stops working (spec): the day after the list's date,
 * 30 days, or never. Dates count from when the link was issued, so a birthday
 * link made in November expires the day after next year's birthday.
 */
export function expiresAt(l: WishList, birthday: Profile['birthday']): number | null {
  const since = l.linkSince ?? Date.now();
  if (l.linkExpiry === '30d') return since + 30 * DAY;
  if (l.linkExpiry === 'date') {
    const d = l.isBirthday ? birthday : l.date;
    if (!d) return null;
    const from = new Date(since);
    const mi = MONTHS.indexOf(d.month);
    let occ = new Date(from.getFullYear(), mi, d.day);
    if (occ.getTime() < new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()) occ = new Date(from.getFullYear() + 1, mi, d.day);
    return occ.getTime() + 2 * DAY; // through the end of the day after
  }
  return null;
}

/** What gets published: only Friends + link lists, never private or Friends-only ones. */
export function publicLists(lists: WishList[], items: Item[], birthday: Profile['birthday']): PublicList[] {
  return lists
    .filter((l) => l.vis === 'invite' && !l.archived)
    .map((l) => ({
      id: l.id,
      slug: slug(l.name),
      name: l.name,
      note: l.note || undefined,
      token: l.linkToken,
      expiresAt: expiresAt(l, birthday),
      items: items
        .filter((i) => i.list === l.id)
        .map((i) => ({
          id: i.id,
          name: i.name,
          price: i.price,
          store: i.store,
          url: i.url,
          image: i.image && /^https:\/\//.test(i.image) ? i.image : undefined,
          size: i.size || undefined,
          note: i.note || undefined,
          star: i.star || undefined,
          pending: i.pending || undefined,
        })),
    }));
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${apiBase()}${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const json = (await res.json().catch(() => null)) as T | null;
  if (!json) throw new Error(`Server answered ${res.status}`);
  return json;
}

export function publish(req: PublishRequest) {
  return call<PublishResponse>('/api/pages', { method: 'PUT', body: JSON.stringify(req) });
}

export function readPage(handle: string, opts: { list?: string; t?: string; gifter?: string }) {
  const p = new URLSearchParams({ handle });
  if (opts.list) p.set('list', opts.list);
  if (opts.t) p.set('t', opts.t);
  if (opts.gifter) p.set('gifter', opts.gifter);
  return call<PageResponse>(`/api/pages?${p}`);
}

export function callDibs(req: DibsRequest) {
  return call<DibsResponse>('/api/dibs', { method: 'POST', body: JSON.stringify(req) });
}

/** True when someone else already has this handle. Null when we can't tell. */
export async function handleTaken(handle: string, secret: string): Promise<boolean | null> {
  try {
    const r = await call<{ ok: boolean; taken?: boolean }>(`/api/pages?${new URLSearchParams({ check: handle, secret })}`);
    return r.ok ? !!r.taken : null;
  } catch {
    return null;
  }
}
