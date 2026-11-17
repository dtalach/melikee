/**
 * Keeps your shared lists live at melikee.app: whenever a Friends + link
 * list, its shinies, your name, birthday or handle change, publish a fresh
 * copy (debounced). Private and Friends-only lists are never sent.
 */
import { useEffect } from 'react';

import { label } from '@/lib/dates';
import { publicLists, publish } from '@/lib/pages';
import { useApp, type AppState } from '@/store/useApp';

const DEBOUNCE_MS = 1500;
const RETRY_MS = 30_000;

function payload(s: AppState) {
  return {
    handle: s.profile.handle,
    profile: { name: s.profile.name, birthday: label(s.profile.birthday) },
    lists: publicLists(s.lists, s.items, s.profile.birthday),
  };
}

export function usePublisher() {
  useEffect(() => {
    let last = '';
    let timer: ReturnType<typeof setTimeout> | null = null;
    let inFlight = false;

    const run = async () => {
      const s = useApp.getState();
      if (!s.onboarded || !s.phone) return;
      const body = payload(s);
      const key = JSON.stringify(body);
      if (key === last || inFlight) return;
      inFlight = true;
      try {
        const res = await publish({ ...body, secret: s.ownerSecret, previousHandle: s.publishedHandle ?? undefined });
        if (res.ok) {
          last = key;
          useApp.setState({ publishState: 'live', publishedHandle: body.handle });
        } else if (res.code === 'signed_out') {
          // The server no longer recognises this device (signed in on another phone).
          useApp.setState({ publishState: 'signed_out', phone: null });
        } else if (res.code === 'taken') {
          last = key; // don't hammer; a handle change makes a new key
          useApp.setState({ publishState: 'taken' });
        } else {
          useApp.setState({ publishState: res.code === 'not_configured' ? 'off' : 'error' });
          schedule(RETRY_MS);
        }
      } catch {
        useApp.setState({ publishState: 'error' });
        schedule(RETRY_MS);
      } finally {
        inFlight = false;
      }
    };
    const schedule = (ms = DEBOUNCE_MS) => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(run, ms);
    };

    schedule(0);
    const unsub = useApp.subscribe((s, prev) => {
      if (s.lists !== prev.lists || s.items !== prev.items || s.profile !== prev.profile || s.onboarded !== prev.onboarded || s.phone !== prev.phone || s.ownerSecret !== prev.ownerSecret) schedule();
    });
    return () => {
      unsub();
      if (timer) clearTimeout(timer);
    };
  }, []);
}
