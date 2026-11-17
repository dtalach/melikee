/**
 * Friends, app side: calls POST /api/friends. See src/lib/friendsContract.ts
 * and server/friends.ts.
 */
import type { ActionResponse, FriendsError, FriendsRequest, SearchResponse, SyncResponse } from './friendsContract';
import { apiBase } from './match';

type Body = FriendsRequest extends infer R ? (R extends { secret: string } ? Omit<R, 'secret'> : never) : never;

async function post<T extends { ok: true }>(secret: string, body: Body): Promise<T | FriendsError> {
  try {
    const res = await fetch(`${apiBase()}/api/friends`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...body, secret }) });
    const json = (await res.json().catch(() => null)) as T | FriendsError | null;
    return json ?? { ok: false, code: 'upstream', message: `Friends answered ${res.status}.` };
  } catch {
    return { ok: false, code: 'upstream', message: 'Couldn’t reach MeLikee. Check your connection.' };
  }
}

export const fetchSync = (secret: string) => post<SyncResponse>(secret, { action: 'sync' });
export const searchPeople = (secret: string, q: string) => post<Extract<SearchResponse, { ok: true }>>(secret, { action: 'search', q });
export const friendAction = (secret: string, body: Exclude<Body, { action: 'sync' } | { action: 'search' }>) => post<Extract<ActionResponse, { ok: true }>>(secret, body);
