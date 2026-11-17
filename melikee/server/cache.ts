/**
 * A day-long memory of answers that cost a Claude call: the same product
 * searched twice (trending items, a popular gift) comes back instantly.
 * Uses the shared-lists database; if that's missing or down, nothing is
 * cached and every call goes to Claude as before.
 */
import { createHash } from 'node:crypto';

import { getStore } from './pages';

export const DAY = 24 * 60 * 60;

export function cacheKey(kind: string, parts: unknown) {
  return `cache:${kind}:v1:${createHash('sha256').update(JSON.stringify(parts)).digest('hex').slice(0, 40)}`;
}

function enabled() {
  return process.env.MELIKEE_STORE === 'memory' || Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

/** Returns the cached answer, or computes it, stores it if `keep(answer)`, and returns it. */
export async function cached<T>(key: string, ttlSec: number, keep: (v: T) => boolean, compute: () => Promise<T>): Promise<T> {
  if (enabled()) {
    try {
      const hit = await getStore().get<T>(key);
      if (hit != null) {
        console.log(`[cache] hit ${key.split(':')[1]}`);
        return hit;
      }
    } catch (e) {
      console.error('[cache] read failed', (e as Error)?.message);
    }
  }
  const value = await compute();
  if (enabled() && keep(value)) {
    getStore()
      .set(key, value, ttlSec)
      .catch((e) => console.error('[cache] write failed', (e as Error)?.message));
  }
  return value;
}
