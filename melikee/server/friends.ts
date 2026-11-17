/**
 * Friends, server side.
 *
 *   acct:<phoneKey>        the account (server/auth.ts), now with uid, handle, name, findByPhone
 *   uid:<uid>              phoneKey — from a stable id back to the account
 *   handles                sorted set of handles, for starts-with search
 *   huid:<handle>          uid — which account a handle belongs to
 *   fr:<uid>               hash: otherUid → Rel, this account's side of each relationship
 *
 * A relationship is written on both sides (mine says "out", theirs says
 * "in"; both say "friends" once accepted). Blocking writes only my side and
 * removes theirs, so they can't see or reach me again.
 *
 * What a friend sees of me: my Friends and Friends + link lists, minus any
 * I switched off for them (Rel.access[listId] === false), read from my
 * published page. Dibs live in the same hash as gifters' dibs on links, so
 * a friend and a link gifter can't both claim one shiny.
 */
import { randomBytes } from 'node:crypto';

import type { FriendListView, FriendView, Pending, Person, Relation, SearchResult, SyncResponse } from '../src/lib/friendsContract';
import type { DibsView } from '../src/lib/pagesContract';
import { allow, normalizePhone, phoneKey, sha, type Account } from './auth';
import { dibsKey, getStore, hash, pageKey, view, type DibsEntry, type PageDoc } from './pages';

type Rel = { s: 'friends' | 'out' | 'in' | 'blocked'; at: number; access?: Record<string, boolean> };
type Me = { key: string; acct: Account & { uid: string } };

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const HANDLES = 'handles';
const relKey = (uid: string) => `fr:${uid}`;

export class FriendsError extends Error {
  constructor(
    readonly code: 'signed_out' | 'not_found' | 'not_friends' | 'blocked' | 'taken' | 'rate_limited' | 'bad_request',
    message: string,
  ) {
    super(message);
  }
}

// ── accounts ───────────────────────────────────────────────────────────────

async function saveAcct(key: string, acct: Account) {
  await getStore().set(`acct:${key}`, acct);
}

/** Accounts made before friends existed get a uid the first time they're seen. */
async function withUid(key: string, acct: Account): Promise<Account & { uid: string }> {
  if (acct.uid) return acct as Account & { uid: string };
  const uid = randomBytes(9).toString('base64url');
  const next = { ...acct, uid };
  await saveAcct(key, next);
  await getStore().set(`uid:${uid}`, key);
  return next;
}

/** The signed-in account behind a device secret, or null. */
export async function accountForSecret(secret: unknown): Promise<Me | null> {
  if (typeof secret !== 'string' || secret.length < 16) return null;
  const s = getStore();
  const key = await s.get<string>(`owner:${sha(secret)}`);
  if (!key) return null;
  const acct = await s.get<Account>(`acct:${key}`);
  if (!acct) return null;
  return { key, acct: await withUid(key, acct) };
}

async function accountForUid(uid: string): Promise<Me | null> {
  if (typeof uid !== 'string' || uid.length > 40) return null;
  const s = getStore();
  const key = await s.get<string>(`uid:${uid}`);
  if (!key) return null;
  const acct = await s.get<Account>(`acct:${key}`);
  return acct?.uid === uid ? { key, acct: acct as Account & { uid: string } } : null;
}

function person(a: Account & { uid: string }): Person {
  const handle = String(a.handle ?? '');
  return {
    uid: a.uid,
    handle,
    name: a.name || handle,
    birthday: a.birth ? `${MONTHS[a.birth.month - 1]} ${a.birth.day}` : undefined,
  };
}

/**
 * Called after a device publishes its page: keeps the account's handle, name
 * and search index current. A handle change moves the index entry.
 */
export async function indexAccount(secret: string, handle: string, name: string) {
  const me = await accountForSecret(secret);
  if (!me) return;
  const s = getStore();
  const old = me.acct.handle ? String(me.acct.handle) : undefined;
  if (old && old !== handle && (await s.get<string>(`huid:${old}`)) === me.acct.uid) {
    await s.zrem(HANDLES, old);
    await s.del(`huid:${old}`);
  }
  await s.zadd(HANDLES, handle);
  await s.set(`huid:${handle}`, me.acct.uid);
  if (old !== handle || me.acct.name !== name) await saveAcct(me.key, { ...me.acct, handle, name: name.slice(0, 60) });
}

// ── relationships ──────────────────────────────────────────────────────────

const getRel = (from: string, to: string) => getStore().hget<Rel>(relKey(from), to);
const setRel = (from: string, to: string, rel: Rel) => getStore().hset(relKey(from), to, rel);
const delRel = (from: string, to: string) => getStore().hdel(relKey(from), to);

export function stateOf(mine: Rel | null): Relation {
  if (!mine) return 'none';
  return mine.s === 'friends' ? 'friends' : mine.s === 'out' ? 'outgoing' : mine.s === 'in' ? 'incoming' : 'none';
}

async function other(uid: string): Promise<Me> {
  const them = await accountForUid(uid);
  if (!them) throw new FriendsError('not_found', 'That account doesn’t exist anymore.');
  return them;
}

export async function request(me: Me, uid: string): Promise<Relation> {
  if (uid === me.acct.uid) throw new FriendsError('bad_request', 'That’s you.');
  await other(uid);
  const mine = await getRel(me.acct.uid, uid);
  const theirs = await getRel(uid, me.acct.uid);
  if (mine?.s === 'blocked') throw new FriendsError('blocked', 'You blocked them. Unblock first.');
  if (mine?.s === 'friends') return 'friends';
  if (mine?.s === 'out') return 'outgoing';
  // They asked first: asking back accepts.
  if (mine?.s === 'in') return accept(me, uid);
  if (!(await allow('friendreq', me.acct.uid, 40, 86400))) throw new FriendsError('rate_limited', 'That’s a lot of requests for one day. Try again tomorrow.');
  const at = Date.now();
  await setRel(me.acct.uid, uid, { s: 'out', at });
  // Someone who blocked me never hears about it; my side just waits.
  if (theirs?.s !== 'blocked') await setRel(uid, me.acct.uid, { s: 'in', at });
  return 'outgoing';
}

export async function accept(me: Me, uid: string): Promise<Relation> {
  const mine = await getRel(me.acct.uid, uid);
  if (mine?.s === 'friends') return 'friends';
  if (mine?.s !== 'in') throw new FriendsError('not_found', 'That request isn’t there anymore.');
  await other(uid);
  const at = Date.now();
  await setRel(me.acct.uid, uid, { s: 'friends', at });
  await setRel(uid, me.acct.uid, { s: 'friends', at });
  return 'friends';
}

/** Decline, cancel and remove all end the relationship on both sides. */
export async function end(me: Me, uid: string, from: Rel['s']): Promise<Relation> {
  const mine = await getRel(me.acct.uid, uid);
  if (mine?.s !== from) return stateOf(mine);
  await delRel(me.acct.uid, uid);
  const theirs = await getRel(uid, me.acct.uid);
  if (theirs && theirs.s !== 'blocked') await delRel(uid, me.acct.uid);
  return 'none';
}

export async function block(me: Me, uid: string): Promise<Relation> {
  if (uid === me.acct.uid) throw new FriendsError('bad_request', 'That’s you.');
  await setRel(me.acct.uid, uid, { s: 'blocked', at: Date.now() });
  const theirs = await getRel(uid, me.acct.uid);
  if (theirs && theirs.s !== 'blocked') await delRel(uid, me.acct.uid);
  return 'none';
}

/** Which of my lists a friend sees. Missing means on. */
export async function setAccess(me: Me, uid: string, list: string, on: boolean) {
  const mine = await getRel(me.acct.uid, uid);
  if (mine?.s !== 'friends') throw new FriendsError('not_friends', 'You’re not friends anymore.');
  await setRel(me.acct.uid, uid, { ...mine, access: { ...(mine.access ?? {}), [list.slice(0, 40)]: on } });
}

export async function setFindByPhone(me: Me, on: boolean) {
  await saveAcct(me.key, { ...me.acct, findByPhone: on });
}

// ── search ─────────────────────────────────────────────────────────────────

/** A full US/Canadian phone number finds one account (if it allows it); anything else is a handle prefix. */
export async function search(me: Me, q: string): Promise<SearchResult[]> {
  if (!(await allow('search', me.acct.uid, 120, 3600))) throw new FriendsError('rate_limited', 'Too many searches. Try again in a bit.');
  const s = getStore();
  const text = q.trim().slice(0, 40);
  const digits = text.replace(/\D/g, '');
  let found: Me[] = [];
  if (!/[a-z_]/i.test(text) && digits.length >= 10) {
    const e164 = normalizePhone(digits);
    if (e164) {
      const key = phoneKey(e164);
      const acct = await s.get<Account>(`acct:${key}`);
      if (acct && acct.findByPhone !== false) found = [{ key, acct: await withUid(key, acct) }];
    }
  } else {
    const prefix = text.toLowerCase().replace(/^@/, '').replace(/[^a-z0-9_.]/g, '');
    if (prefix.length < 2) return [];
    const handles = await s.zprefix(HANDLES, prefix, 15);
    for (const h of handles) {
      const uid = await s.get<string>(`huid:${h}`);
      const them = uid ? await accountForUid(String(uid)) : null;
      // The index can lag a handle change by one publish; trust the account.
      if (them && String(them.acct.handle) === h) found.push(them);
    }
  }
  const out: SearchResult[] = [];
  for (const them of found) {
    if (them.acct.uid === me.acct.uid || !them.acct.handle) continue;
    const mine = await getRel(me.acct.uid, them.acct.uid);
    const theirs = await getRel(them.acct.uid, me.acct.uid);
    // Blocked either way: they don't exist to each other.
    if (mine?.s === 'blocked' || theirs?.s === 'blocked') continue;
    out.push({ ...person(them.acct), state: stateOf(mine) });
  }
  return out.slice(0, 10);
}

// ── what friends share ─────────────────────────────────────────────────────

/** The lists `owner` shares with `viewer`, with dibs as the viewer sees them. */
async function sharedWith(owner: Account & { uid: string }, viewerUid: string, access: Record<string, boolean>): Promise<FriendListView[]> {
  if (!owner.handle) return [];
  const s = getStore();
  const doc = await s.get<PageDoc>(pageKey(String(owner.handle)));
  if (!doc) return [];
  const lists: FriendListView[] = [];
  for (const l of doc.lists) {
    if (access[l.id] === false) continue;
    const entries = await s.hgetall<DibsEntry>(dibsKey(String(owner.handle), l.id));
    lists.push({ id: l.id, name: l.name, isBirthday: l.isBirthday, date: l.date, items: l.items, dibs: view(entries, friendGifter(viewerUid)) });
  }
  return lists;
}

/** Friends call dibs under a gifter id derived from their account. */
const friendGifter = (uid: string) => `friend:${uid}`;

export async function sync(me: Me): Promise<SyncResponse> {
  const s = getStore();
  const rels = await s.hgetall<Rel>(relKey(me.acct.uid));
  const friends: FriendView[] = [];
  const incoming: Pending[] = [];
  const outgoing: Pending[] = [];
  for (const [uid, mine] of Object.entries(rels)) {
    if (mine.s === 'blocked') continue;
    const them = await accountForUid(uid);
    if (!them) {
      await delRel(me.acct.uid, uid);
      continue;
    }
    if (mine.s === 'in') incoming.push({ ...person(them.acct), at: mine.at });
    else if (mine.s === 'out') outgoing.push({ ...person(them.acct), at: mine.at });
    else {
      const theirs = await getRel(uid, me.acct.uid);
      // They removed or blocked me: the friendship is over on my side too.
      if (theirs?.s !== 'friends') {
        await delRel(me.acct.uid, uid);
        continue;
      }
      friends.push({ ...person(them.acct), since: mine.at, access: mine.access ?? {}, lists: await sharedWith(them.acct, me.acct.uid, theirs.access ?? {}) });
    }
  }
  return {
    ok: true,
    me: { uid: me.acct.uid, handle: String(me.acct.handle ?? ''), findByPhone: me.acct.findByPhone !== false },
    friends,
    incoming: incoming.sort((a, b) => b.at - a.at),
    outgoing: outgoing.sort((a, b) => b.at - a.at),
  };
}

/** A friend calls (or drops) dibs on one of my shinies — or rather, I do on theirs. */
export async function friendDibs(me: Me, uid: string, listId: string, itemId: number, claim: boolean): Promise<DibsView> {
  const mine = await getRel(me.acct.uid, uid);
  const theirs = await getRel(uid, me.acct.uid);
  if (mine?.s !== 'friends' || theirs?.s !== 'friends') throw new FriendsError('not_friends', 'You’re not friends anymore.');
  if (theirs.access?.[listId] === false) throw new FriendsError('not_found', 'That list isn’t shared with you anymore.');
  const owner = await other(uid);
  const handle = String(owner.acct.handle ?? '');
  const s = getStore();
  const doc = handle ? await s.get<PageDoc>(pageKey(handle)) : null;
  const list = doc?.lists.find((l) => l.id === listId);
  const item = list?.items.find((i) => i.id === itemId);
  if (!list || !item) throw new FriendsError('not_found', 'That shiny isn’t on the list anymore.');
  if (item.pending) throw new FriendsError('bad_request', 'They’re still choosing that one.');
  const key = dibsKey(handle, listId);
  const field = String(itemId);
  const gifter = hash(friendGifter(me.acct.uid));
  if (claim) {
    const won = await s.hsetnx(key, field, { name: (me.acct.name || String(me.acct.handle ?? 'A friend')).slice(0, 40), gifter, at: Date.now() } satisfies DibsEntry);
    if (!won) {
      const cur = await s.hget<DibsEntry>(key, field);
      if (cur?.gifter !== gifter) throw new FriendsError('taken', `${cur?.name ?? 'Someone'} already has it.`);
    }
  } else {
    const cur = await s.hget<DibsEntry>(key, field);
    if (cur && cur.gifter === gifter) await s.hdel(key, field);
  }
  return view(await s.hgetall<DibsEntry>(key), friendGifter(me.acct.uid));
}
