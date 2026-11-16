import { useEffect, useState } from 'react';

import { RESERVED_HANDLES } from '@/lib/links';
import { handleTaken } from '@/lib/pages';
import { useApp } from '@/store/useApp';

export const HANDLE = /^[a-z0-9_.]{3,20}$/;

export type HandleStatus = 'invalid' | 'checking' | 'free' | 'taken' | 'unknown';

/**
 * Is this handle usable? Format first, then (debounced) whether someone else
 * already owns it on the server. "unknown" (offline, or sharing not switched
 * on) doesn't block: the publisher will report a clash later.
 */
export function useHandleCheck(handle: string): HandleStatus {
  const secret = useApp((s) => s.ownerSecret);
  const valid = HANDLE.test(handle) && !RESERVED_HANDLES.has(handle);
  const [result, setResult] = useState<{ handle: string; status: HandleStatus } | null>(null);

  useEffect(() => {
    if (!valid) return;
    let live = true;
    const t = setTimeout(async () => {
      const taken = await handleTaken(handle, secret);
      if (live) setResult({ handle, status: taken == null ? 'unknown' : taken ? 'taken' : 'free' });
    }, 400);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [handle, valid, secret]);

  if (!valid) return RESERVED_HANDLES.has(handle) ? 'taken' : 'invalid';
  return result?.handle === handle ? result.status : 'checking';
}

export function handleNote(handle: string, status: HandleStatus) {
  if (status === 'invalid') return '3–20 letters, numbers, _ or .';
  if (status === 'taken') return `@${handle} is taken — try another`;
  if (status === 'checking') return `Checking @${handle}…`;
  return `✓ @${handle} is yours`;
}
