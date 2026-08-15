/**
 * Where the app's state lives between launches.
 *
 * Until now nothing survived a reload, which was the agreed scope but made the
 * app quietly dishonest: it invites you to build a wishlist and then throws it
 * away. Everything a user made — their lists, their shinies, who can see what,
 * what they've called dibs on — is now written to device storage.
 *
 * AsyncStorage rather than a database: this is a few kilobytes of JSON with no
 * queries over it, it works identically on iOS, Android and web, and swapping
 * it for SQLite later is a change to this file.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { createJSONStorage } from 'zustand/middleware';

import type { Shiny } from '@/store/types';

/**
 * Bumping this discards saved state that no longer matches the code. There is
 * a `migrate` hook for when that becomes too rude, but while the app has no
 * accounts, a clean start beats a half-migrated one.
 */
export const PERSIST_VERSION = 1;

export const PERSIST_KEY = 'melikee.state';

export const persistStorage = createJSONStorage(() => AsyncStorage);

/**
 * A captured photo is a URI, and what that URI means depends on the platform.
 * On a device it points at a cache file, which is small to store and might be
 * swept up by the OS — worth keeping, worth surviving the loss of. On web it is
 * the entire image inline as base64, and a handful of those will blow through
 * localStorage's five-megabyte quota and take every other saved thing with
 * them. So inline photos are dropped on the way to storage: the shiny survives
 * the reload, its picture doesn't.
 */
export function stripInlinePhotos(items: Shiny[]): Shiny[] {
  return items.map((item) =>
    item.photoUri?.startsWith('data:') ? { ...item, photoUri: undefined } : item,
  );
}

/**
 * Ids are handed out from a counter, so a restored session has to start above
 * everything it restored or the next capture overwrites an old one.
 */
export function highestId(...groups: { id: string }[][]): number {
  let highest = 0;
  for (const group of groups) {
    for (const { id } of group) {
      const n = Number(id);
      if (Number.isFinite(n) && n > highest) highest = n;
    }
  }
  return highest;
}

// ── Hydration ──────────────────────────────────────────────────────────────

/**
 * Reading storage is asynchronous, so for one frame the app holds defaults
 * rather than the user's own data. Rendering that frame would flash Maya's
 * seed lists at someone who has their own — so the shell waits instead.
 *
 * This is deliberately not part of the app store: it is a fact about the store,
 * not a fact about the user, and putting it inside would mean persisting it.
 */
let hydrated = false;
const listeners = new Set<() => void>();

export function markHydrated() {
  if (hydrated) return;
  hydrated = true;
  listeners.forEach((listener) => listener());
}

export function useHydrated(): boolean {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => hydrated,
    // On the server render there is nothing to wait for, and blocking would
    // ship an empty page to a crawler.
    () => true,
  );
}
