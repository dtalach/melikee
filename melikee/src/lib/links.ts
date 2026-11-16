/**
 * Public links, as the design shows them:
 *
 *   melikee.app/<handle>                your page: "Friends find you here"
 *   melikee.app/<handle>/<list>?t=…     one list, for gifters with the link
 *
 * A list link carries the list's token, so "Reset link" kills old copies
 * (spec). The short form without the token is what the app displays.
 */
import type { WishList } from '@/store/types';

export const SITE = 'melikee.app';

/** Handles that would collide with the app's own paths. */
export const RESERVED_HANDLES = new Set(['g', 'api', 'assets', '_expo', 'favicon.ico', 'melikee', 'admin']);

export function slug(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'list';
}

export function profileLink(handle: string) {
  return { display: `${SITE}/${handle}`, url: `https://${SITE}/${handle}` };
}

export function listLink(handle: string, list: WishList) {
  const path = `${SITE}/${handle}/${slug(list.name)}`;
  return { display: path, url: `https://${path}?t=${list.linkToken}` };
}

type Resolve = { profileHandle: string; lists: WishList[] };

/** Only Friends + link lists open from a link (spec), and never archived ones. */
const shareable = (l: WishList) => l.vis === 'invite' && !l.archived;

/** melikee.app/<handle>: My wants if it's linkable, else the first linkable list. */
export function resolveProfile(s: Resolve, handle: string): { listId: string | null } {
  if (handle.toLowerCase() !== s.profileHandle) return { listId: null };
  const list = s.lists.find((l) => l.id === 'w' && shareable(l)) ?? s.lists.find(shareable);
  return { listId: list?.id ?? null };
}

/** melikee.app/<handle>/<list>?t=… — the token must match the list's current one. */
export function resolveList(s: Resolve, handle: string, listSlug: string, token?: string): { listId: string | null } {
  if (handle.toLowerCase() !== s.profileHandle || !token) return { listId: null };
  const list = s.lists.find((l) => slug(l.name) === listSlug && l.linkToken === token && shareable(l));
  return { listId: list?.id ?? null };
}
