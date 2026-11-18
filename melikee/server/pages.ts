/**
 * Shared lists, server side.
 *
 *   page:<handle>             JSON: owner secret hash, name, birthday, sizes, published lists
 *   dibs:<handle>:<listId>    hash: itemId -> { name, gifter (hashed), at }
 *
 * The owner's device publishes with a secret only it holds; the first device
 * to publish a handle owns it. Dibs are a separate hash so a claim is one
 * atomic HSETNX ("one claim per shiny", spec) and republishing never wipes
 * them. The owner's app never reads dibs: the wisher never sees what's claimed.
 */
import { createHash } from 'node:crypto';
import { Redis } from '@upstash/redis';

import { cleanSizes, type Sizes } from '../src/lib/sizes';
import type { DibsRequest, DibsView, PageResponse, PublicList, PublishRequest } from '../src/lib/pagesContract';

// ── storage ────────────────────────────────────────────────────────────────

export interface Store {
  get<T>(key: string): Promise<T | null>;
  /** With `ttlSec`, the key expires that long after it's written. */
  set(key: string, value: unknown, ttlSec?: number): Promise<void>;
  del(key: string): Promise<void>;
  hgetall<T>(key: string): Promise<Record<string, T>>;
  /** Set only if the field is empty. True when this call set it. */
  hsetnx(key: string, field: string, value: unknown): Promise<boolean>;
  hdel(key: string, field: string): Promise<void>;
  hget<T>(key: string, field: string): Promise<T | null>;
  hset(key: string, field: string, value: unknown): Promise<void>;
  /** Sorted set used as a lexicographic index (all scores 0). */
  zadd(key: string, member: string): Promise<void>;
  zrem(key: string, member: string): Promise<void>;
  /** Members starting with `prefix`, in order, at most `limit`. */
  zprefix(key: string, prefix: string, limit: number): Promise<string[]>;
  /** Every key matching a glob pattern (small databases only). */
  scan(match: string): Promise<string[]>;
  /** Add one; the key expires `ttlSec` after it's first created. Returns the new count. */
  incr(key: string, ttlSec: number): Promise<number>;
}

class RedisStore implements Store {
  private r = Redis.fromEnv();
  async get<T>(key: string) {
    return (await this.r.get<T>(key)) ?? null;
  }
  async set(key: string, value: unknown, ttlSec?: number) {
    if (ttlSec) await this.r.set(key, value, { ex: ttlSec });
    else await this.r.set(key, value);
  }
  async del(key: string) {
    await this.r.del(key);
  }
  async hgetall<T>(key: string) {
    return ((await this.r.hgetall<Record<string, T>>(key)) ?? {}) as Record<string, T>;
  }
  async hsetnx(key: string, field: string, value: unknown) {
    return (await this.r.hsetnx(key, field, value)) === 1;
  }
  async hdel(key: string, field: string) {
    await this.r.hdel(key, field);
  }
  async hget<T>(key: string, field: string) {
    return ((await this.r.hget<T>(key, field)) ?? null) as T | null;
  }
  async hset(key: string, field: string, value: unknown) {
    await this.r.hset(key, { [field]: value });
  }
  async zadd(key: string, member: string) {
    await this.r.zadd(key, { score: 0, member });
  }
  async zrem(key: string, member: string) {
    await this.r.zrem(key, member);
  }
  async scan(match: string) {
    const keys: string[] = [];
    let cursor: string | number = '0';
    do {
      const [next, batch]: [string | number, string[]] = await this.r.scan(cursor, { match, count: 500 });
      keys.push(...batch.map(String));
      cursor = next;
    } while (String(cursor) !== '0');
    return keys;
  }
  async zprefix(key: string, prefix: string, limit: number) {
    const out = await this.r.zrange<unknown[]>(key, `[${prefix}`, `[${prefix}\xff`, { byLex: true, offset: 0, count: limit });
    // Upstash parses "123" as a number; members are always strings here.
    return out.map(String);
  }
  async incr(key: string, ttlSec: number) {
    const n = await this.r.incr(key);
    if (n === 1) await this.r.expire(key, ttlSec);
    return n;
  }
}

/** For local testing only (MELIKEE_STORE=memory): forgets everything on restart. */
class MemoryStore implements Store {
  private kv = new Map<string, unknown>();
  private h = new Map<string, Map<string, unknown>>();
  async get<T>(key: string) {
    return (this.kv.get(key) as T) ?? null;
  }
  async set(key: string, value: unknown) {
    this.kv.set(key, JSON.parse(JSON.stringify(value)));
  }
  async del(key: string) {
    this.kv.delete(key);
    this.h.delete(key);
  }
  async hgetall<T>(key: string) {
    return Object.fromEntries(this.h.get(key) ?? []) as Record<string, T>;
  }
  async hsetnx(key: string, field: string, value: unknown) {
    const m = this.h.get(key) ?? new Map();
    this.h.set(key, m);
    if (m.has(field)) return false;
    m.set(field, value);
    return true;
  }
  async hdel(key: string, field: string) {
    this.h.get(key)?.delete(field);
  }
  async hget<T>(key: string, field: string) {
    return (this.h.get(key)?.get(field) as T) ?? null;
  }
  async hset(key: string, field: string, value: unknown) {
    const m = this.h.get(key) ?? new Map();
    this.h.set(key, m);
    m.set(field, JSON.parse(JSON.stringify(value)));
  }
  private z = new Map<string, Set<string>>();
  async zadd(key: string, member: string) {
    const set = this.z.get(key) ?? new Set();
    this.z.set(key, set);
    set.add(member);
  }
  async zrem(key: string, member: string) {
    this.z.get(key)?.delete(member);
  }
  async scan(match: string) {
    const re = new RegExp(`^${match.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
    return [...this.kv.keys()].filter((k) => re.test(k));
  }
  async zprefix(key: string, prefix: string, limit: number) {
    return [...(this.z.get(key) ?? [])].filter((m) => m.startsWith(prefix)).sort().slice(0, limit);
  }
  async incr(key: string) {
    const n = ((this.kv.get(key) as number) ?? 0) + 1;
    this.kv.set(key, n);
    return n;
  }
}

export function isConfigured() {
  return process.env.MELIKEE_STORE === 'memory' || Boolean((process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL) && (process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN));
}

let store: Store | null = null;
export function getStore(): Store {
  if (!store) store = process.env.MELIKEE_STORE === 'memory' ? new MemoryStore() : new RedisStore();
  return store;
}

// ── shapes ─────────────────────────────────────────────────────────────────

export type PageDoc = { owner: string; name: string; birthday: string; sizes?: Sizes; lists: PublicList[]; updatedAt: number };
export type DibsEntry = { name: string; gifter: string; at: number };

const HANDLE = /^[a-z0-9_.]{3,20}$/;
export const pageKey = (h: string) => `page:${h}`;
export const dibsKey = (h: string, list: string) => `dibs:${h}:${list}`;
export const hash = (s: string) => createHash('sha256').update(s).digest('hex');

export function validHandle(h: unknown): h is string {
  return typeof h === 'string' && HANDLE.test(h);
}

/** Drops anything that shouldn't leave the device or doesn't fit the contract. */
export function cleanLists(lists: unknown): PublicList[] | null {
  if (!Array.isArray(lists) || lists.length > 30) return null;
  const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : undefined);
  const https = (v: unknown) => (typeof v === 'string' && /^https:\/\/\S+$/i.test(v) && v.length < 2000 ? v : undefined);
  const out: PublicList[] = [];
  for (const l of lists as Record<string, unknown>[]) {
    if (!l || typeof l.id !== 'string' || typeof l.token !== 'string' || typeof l.slug !== 'string' || !Array.isArray(l.items) || l.items.length > 300) return null;
    out.push({
      id: l.id.slice(0, 40),
      slug: l.slug.slice(0, 60),
      name: str(l.name, 80) ?? 'List',
      note: str(l.note, 400),
      token: l.token.slice(0, 40),
      expiresAt: typeof l.expiresAt === 'number' ? l.expiresAt : null,
      friendsOnly: l.friendsOnly === true || undefined,
      isBirthday: l.isBirthday === true || undefined,
      date: str(l.date, 10),
      items: (l.items as Record<string, unknown>[])
        .filter((i) => i && typeof i.id === 'number' && typeof i.name === 'string')
        .map((i) => ({
          id: i.id as number,
          name: (i.name as string).slice(0, 160),
          price: str(i.price, 20) ?? '—',
          store: str(i.store, 60) ?? '',
          url: https(i.url),
          // Only real web images: a pending shiny's photo lives on the owner's phone.
          image: https(i.image),
          size: str(i.size, 60),
          note: str(i.note, 200),
          star: i.star === true || undefined,
          pending: i.pending === true || undefined,
          at: typeof i.at === 'number' ? i.at : undefined,
        })),
    });
  }
  return out;
}

// ── owner ──────────────────────────────────────────────────────────────────

export async function publish(req: PublishRequest): Promise<'ok' | 'taken'> {
  const s = getStore();
  const owner = hash(req.secret);
  const existing = await s.get<PageDoc>(pageKey(req.handle));
  if (existing && existing.owner !== owner) return 'taken';

  const doc: PageDoc = { owner, name: req.profile.name.slice(0, 60), birthday: req.profile.birthday.slice(0, 20), sizes: cleanSizes(req.profile.sizes), lists: cleanLists(req.lists) ?? [], updatedAt: Date.now() };
  await s.set(pageKey(req.handle), doc);
  // Which page this device publishes, so signing in on a new phone can move it.
  await s.set(`owns:${owner}`, req.handle);

  // Lists that are no longer shared lose their dibs too.
  const live = new Set(doc.lists.map((l) => l.id));
  for (const l of existing?.lists ?? []) if (!live.has(l.id)) await s.del(dibsKey(req.handle, l.id));

  if (req.previousHandle && req.previousHandle !== req.handle && validHandle(req.previousHandle)) {
    const old = await s.get<PageDoc>(pageKey(req.previousHandle));
    if (old && old.owner === owner) {
      await s.del(pageKey(req.previousHandle));
      for (const l of old.lists) await s.del(dibsKey(req.previousHandle, l.id));
    }
  }
  return 'ok';
}

/** The owner's published lists (no dibs: the wisher never sees them). For restoring on a new phone. */
export async function ownPage(handle: string, secret: string) {
  const doc = await getStore().get<PageDoc>(pageKey(handle));
  if (!doc || doc.owner !== hash(secret)) return null;
  return { name: doc.name, sizes: doc.sizes, lists: doc.lists };
}

/** Is this handle owned by someone other than the holder of `secret`? */
export async function isTaken(handle: string, secret?: string): Promise<boolean> {
  const doc = await getStore().get<PageDoc>(pageKey(handle));
  return !!doc && (!secret || doc.owner !== hash(secret));
}

// ── gifters ────────────────────────────────────────────────────────────────

/**
 * Which list a link opens. A list link needs its current token; the profile
 * link (melikee.app/<handle>) opens My wants if shared, else the first shared
 * list, with no token.
 */
function resolve(doc: PageDoc, listSlug?: string, token?: string): PublicList | null {
  const now = Date.now();
  // Friends lists never open from a link, whatever the token.
  const alive = (l: PublicList) => !l.friendsOnly && (l.expiresAt == null || l.expiresAt > now);
  if (!listSlug) return [doc.lists.find((l) => l.id === 'w'), ...doc.lists].find((l) => l && alive(l)) ?? null;
  const l = doc.lists.find((x) => (x.slug === listSlug || x.id === listSlug) && x.token === token);
  return l && alive(l) ? l : null;
}

export function view(entries: Record<string, DibsEntry>, gifter?: string): DibsView {
  const me = gifter ? hash(gifter) : '';
  return Object.fromEntries(Object.entries(entries).map(([id, e]) => [id, { name: e.name, mine: e.gifter === me }]));
}

export async function readPage(handle: string, listSlug?: string, token?: string, gifter?: string): Promise<PageResponse> {
  const s = getStore();
  const doc = await s.get<PageDoc>(pageKey(handle));
  const list = doc && resolve(doc, listSlug, token);
  if (!doc || !list) return { ok: false, code: 'expired', message: 'This list link has expired.' };
  const dibs = await s.hgetall<DibsEntry>(dibsKey(handle, list.id));
  return {
    ok: true,
    owner: { name: doc.name, birthday: doc.birthday, sizes: doc.sizes },
    list: { id: list.id, name: list.name, note: list.note, isMain: list.id === 'w', items: list.items },
    dibs: view(dibs, gifter),
  };
}

export async function dibs(req: DibsRequest): Promise<{ result: 'ok' | 'taken' | 'expired'; dibs: DibsView }> {
  const s = getStore();
  const doc = await s.get<PageDoc>(pageKey(req.handle));
  // Reachable by this link? Either through the list's own token, or it's the
  // list the profile link (no token) opens.
  const byToken = doc && req.t ? resolve(doc, req.list, req.t) : null;
  const byProfile = doc ? resolve(doc) : null;
  const list = byToken ?? (byProfile?.id === req.list ? byProfile : null);
  if (!doc || !list) return { result: 'expired', dibs: {} };
  const item = list.items.find((i) => i.id === req.itemId);
  const key = dibsKey(req.handle, list.id);
  if (!item || item.pending) return { result: 'expired', dibs: view(await s.hgetall<DibsEntry>(key), req.gifter) };

  const field = String(req.itemId);
  const me = hash(req.gifter);
  let result: 'ok' | 'taken' = 'ok';
  if (req.action === 'claim') {
    const won = await s.hsetnx(key, field, { name: req.name.slice(0, 40), gifter: me, at: Date.now() } satisfies DibsEntry);
    if (!won) {
      const cur = (await s.hgetall<DibsEntry>(key))[field];
      result = cur && cur.gifter === me ? 'ok' : 'taken';
    }
  } else {
    // Only the gifter who called dibs can let it go.
    const cur = (await s.hgetall<DibsEntry>(key))[field];
    if (cur && cur.gifter === me) await s.hdel(key, field);
  }
  return { result, dibs: view(await s.hgetall<DibsEntry>(key), req.gifter) };
}
