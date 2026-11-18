/**
 * The app's one store.
 *
 * Content (lists, shinies, friends, settings) persists on the device. Screen,
 * sheet, toast and the capture ritual are session state and start fresh on
 * every launch. Friends, requests and what friends share come from /api/friends
 * (syncFriends) and are rebuilt on every sync.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { daysUntil, MONTHS, parseLabel, shortDate, type MonthDay } from '@/lib/dates';
import { fetchSync, friendAction } from '@/lib/friends';
import { buildSignals, fetchIdeas, type IdeaFeedback } from '@/lib/ideas';
import type { Budget, Idea, Theme } from '@/lib/ideasContract';
import type { SyncResponse } from '@/lib/friendsContract';
import { find, imageFor, MISS, readPhoto, type Match, type Miss } from '@/lib/match';
import type { VerifyResponse } from '@/lib/authContract';
import type { ImagePayload, StoreOffer } from '@/lib/matchContract';
import { christmasList, SAMPLE, startingLists, startingProfile, token } from './seed';
import type {
  Contact,
  FeedEntry,
  Friend,
  FriendList,
  FriendRequest,
  Item,
  LinkHolder,
  Notif,
  NotifSettings,
  Profile,
  Route,
  SentInvite,
  Sheet,
  Vis,
  WishList,
} from './types';

export const FILING_SECONDS = 6;

export type CaptureMode = 'scan' | 'snap' | 'say';
export type CapturePhase = 'idle' | 'snap' | 'scan' | 'found' | 'fly' | 'nomatch' | 'alts' | 'type';

/** What a capture starts from. Every path ends at /api/match. */
export type CaptureInput =
  | { source: 'photo' | 'screenshot'; image?: ImagePayload; uri?: string; thumb?: string }
  | { source: 'barcode'; upc: string }
  | { source: 'voice' | 'search' | 'catalog'; query: string }
  | { source: 'link'; url: string };

const NOTES: Record<CaptureInput['source'], string> = {
  photo: 'reading your photo',
  screenshot: 'reading your screenshot',
  barcode: 'exact match from the barcode',
  voice: 'matching your words to products',
  search: 'searching stores',
  catalog: 'checking prices',
  link: 'opening your link',
};

export type Capture = {
  phase: CapturePhase;
  mode: CaptureMode;
  match: Match | null;
  alternates: Match[];
  chosen: number;
  fromRoll: boolean;
  /** "Wrong product?" on a saved shiny re-opens the alternates for it. */
  fixItem: number | null;
  star: boolean;
  size: string;
  storesOpen: boolean;
  destOpen: boolean;
  sizeEditing: boolean;
  typeQ: string;
  /** The text box was filled in by dictation: searching treats it as said, not typed. */
  typeHeard: boolean;
  /** What the camera returns to on ✕. */
  from: Route | null;
  /** Why the last capture found nothing — the miss sheet's words. */
  miss: Miss | null;
  /** Status line under the spinner while matching. */
  note: string;
  /** The input being matched, kept so a miss can be saved and matched later. */
  input: CaptureInput | null;
  /** The photo the user took, shown inset on the found sheet. */
  shotUri: string | null;
  /** A small copy of the shot, kept on the shiny when the store has no photo. */
  shotThumb: string | null;
  /** The colour picked on the found sheet, when the product comes in several. */
  variant: string | null;
  /** Say mode: live transcript while the shutter is held. */
  transcript: string;
  listening: boolean;
};

const idleCapture: Capture = {
  phase: 'idle',
  mode: 'snap',
  match: null,
  alternates: [],
  chosen: 0,
  fromRoll: false,
  fixItem: null,
  star: false,
  size: '',
  storesOpen: false,
  destOpen: false,
  sizeEditing: false,
  typeQ: '',
  typeHeard: false,
  from: null,
  miss: null,
  note: '',
  input: null,
  shotUri: null,
  shotThumb: null,
  variant: null,
  transcript: '',
  listening: false,
};

type Content = {
  onboarded: boolean;
  firstRun: boolean;
  profile: Profile;
  lists: WishList[];
  items: Item[];
  nextId: number;
  lastList: string;
  friends: Friend[];
  friendLists: FriendList[];
  friendDibs: Record<string, boolean>;
  feed: FeedEntry[];
  contacts: Contact[];
  /** Friend requests waiting for me, from the server. */
  requests: FriendRequest[];
  /** My requests waiting on them. */
  sent: SentInvite[];
  /** Others can find me by my full phone number. */
  findByPhone: boolean;
  /** Gift inspiration: the current batch (persisted so the tab opens instantly) and how it was asked for. */
  /** `next`: the following page, fetched while the person looks at `cards`, so scrolling on is instant. */
  ideas: { cards: IdeaCard[]; next?: IdeaCard[]; themes: Theme[]; budget: Budget; at: number };
  /** How the person reacted to ideas: the strongest taste signal there is. */
  ideaFeedback: IdeaFeedback;
  /** What they recently typed or said on the capture screen. */
  recentQueries: string[];
  /** Feed entries I loved or added, kept across syncs (the Feed itself is rebuilt each time). */
  feedLocal: Record<string, { heart?: boolean; wanted?: boolean }>;
  linkHolders: LinkHolder[];
  notifs: Notif[];
  notifSettings: NotifSettings;
  /** The name a gifter types on first dibs, shown to other gifters only. */
  gifterName: string;
  gifterDibs: Record<number, boolean>;
  /** Year the post-birthday "Got it / Still want" sort was done. */
  cleanupYear: number | null;
  /** Proves to the server that this device owns its handle's page. Never shown. */
  ownerSecret: string;
  /** This device's identity when it calls dibs on someone else's list. */
  gifterId: string;
  /** The handle last published under, so a handle change removes the old page. */
  publishedHandle: string | null;
  /** The verified number this account signs in with; only its last two digits are kept. */
  phone: { last2: string; verifiedAt: number } | null;
  /** Someone under 13 tried to sign up on this device. MeLikee is 13+ (like Snapchat), so it stays blocked. */
  ageBlocked: boolean;
};

/** An idea as the Ideas tab shows it. */
export type IdeaCard = Idea & { image?: string; state?: 'wanted' | 'dismissed' };

type Session = {
  stack: Route[];
  sheet: Sheet | null;
  toast: { msg: string; key: number } | null;
  capture: Capture;
  filing: { itemId: number; key: number } | null;
  /** Whether your shared lists are live at melikee.app. */
  publishState: 'idle' | 'live' | 'taken' | 'off' | 'error' | 'signed_out';
  /** Gift inspiration is fetching a batch. */
  ideasLoading: boolean;
  ideasError: string | null;
};

type Actions = {
  go: (r: Route) => void;
  tab: (name: 'feed' | 'ideas' | 'lists' | 'people' | 'me') => void;
  back: () => void;
  replace: (r: Route) => void;
  openSheet: (s: Sheet) => void;
  closeSheet: () => void;
  showToast: (msg: string) => void;

  // capture
  openCamera: (opts?: { mode?: CaptureMode; dest?: string }) => void;
  closeCamera: () => void;
  setCapture: (patch: Partial<Capture>) => void;
  runCapture: (input: CaptureInput) => Promise<void>;
  /** "Wrong product?": near matches for a saved shiny, or a typed search to replace it. */
  openAlternates: (itemId: number, query?: string) => Promise<void>;
  resetCapture: () => void;
  /** Pick one of the product's colours on the found sheet; the photo follows. */
  pickVariant: (v: string) => void;
  wantIt: () => void;
  savePending: () => void;
  fixWith: (m: Match) => void;
  undoFiling: () => void;
  endFiling: () => void;

  // items
  addItem: (it: Omit<Item, 'id' | 'createdAt'>, opts?: { file?: boolean }) => number;
  updateItem: (id: number, patch: Partial<Item>) => void;
  removeItem: (id: number) => void;

  // lists
  createList: (l: { name: string; vis: Vis; accent: string; date?: MonthDay }) => string;
  updateList: (id: string, patch: Partial<WishList>) => void;
  setVis: (id: string, vis: Vis) => void;
  archiveList: (id: string) => void;
  deleteList: (id: string) => void;
  resetLink: (id?: string) => void;

  // people (all server-backed; see src/lib/friends.ts)
  /** Refresh friends, requests and what friends share. Quiet on failure. */
  syncFriends: () => Promise<void>;
  /** Send a request (or accept theirs). Returns the new relation, or an error message. */
  sendRequest: (uid: string, name: string) => Promise<string | null>;
  acceptRequest: (uid: string) => Promise<void>;
  declineRequest: (uid: string) => Promise<void>;
  cancelInvite: (uid: string) => Promise<void>;
  toggleAccess: (friendId: string, listId: string) => void;
  removeFriend: (uid: string) => Promise<void>;
  blockFriend: (uid: string) => Promise<void>;
  setFindByPhone: (on: boolean) => void;

  // gift inspiration
  /** Fetch ideas: a fresh batch, or `more` added to the end. */
  loadIdeas: (more?: boolean) => Promise<void>;
  setIdeaBudget: (b: Budget) => void;
  /** Save an idea to My wants (stores and price are found in the background). */
  wantIdea: (id: string) => void;
  dismissIdea: (id: string) => void;

  // feed + dibs
  wantToo: (id: string) => void;
  /** Call or drop dibs on a friend's shiny. */
  toggleFriendDibs: (listId: string, itemId: string) => Promise<void>;
  setGifterName: (name: string) => void;
  toggleGifterDibs: (itemId: number) => void;

  // notifications
  markRead: (id: string) => void;
  markAllRead: () => void;

  // profile
  setProfile: (patch: Partial<Profile>) => void;
  finishOnboarding: (p: { handle: string; birthday: Profile['birthday']; parent: string; privateDefault: boolean }) => void;
  /** After a correct code: store the device's new secret, and on a restore bring back the account's handle and shared lists. */
  applySignIn: (r: Extract<VerifyResponse, { ok: true }>) => void;
  finishCleanup: (sorted: { got: number[]; kept: number[] }) => void;
};

export type AppState = Content & Session & Actions;

function freshContent(): Content {
  return {
    onboarded: false,
    firstRun: true,
    profile: startingProfile(),
    lists: startingLists(),
    items: [],
    nextId: 100,
    lastList: 'w',
    friends: [],
    friendLists: [],
    friendDibs: {},
    feed: [],
    contacts: [],
    requests: [],
    sent: [],
    findByPhone: true,
    feedLocal: {},
    ideas: { cards: [], next: [], themes: [], budget: 'any', at: 0 },
    ideaFeedback: { liked: [], disliked: [] },
    recentQueries: [],
    linkHolders: [],
    notifs: [],
    notifSettings: { drop: true, bday: true, too: true, coming: true, req: true },
    gifterName: '',
    gifterDibs: {},
    cleanupYear: null,
    ownerSecret: secret(),
    gifterId: secret(),
    publishedHandle: null,
    phone: null,
    ageBlocked: false,
  };
}

let timers: ReturnType<typeof setTimeout>[] = [];
function later(fn: () => void, ms: number) {
  timers.push(setTimeout(fn, ms));
}
function clearTimers() {
  timers.forEach(clearTimeout);
  timers = [];
}

/** Bumped per capture so a slow answer to an abandoned capture is ignored. */
let captureRun = 0;

/** A long random string for device secrets (not a security boundary beyond "hard to guess"). */
function secret() {
  return Array.from({ length: 4 }, () => Math.random().toString(36).slice(2, 12)).join('');
}
let toastKey = 0;
let filingKey = 0;
let filingTimer: ReturnType<typeof setTimeout> | null = null;

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      ...freshContent(),
      stack: [{ name: 'feed' }],
      sheet: null,
      toast: null,
      capture: idleCapture,
      filing: null,
      publishState: 'idle',
      ideasLoading: false,
      ideasError: null,

      go: (r) => set((s) => ({ stack: [...s.stack, r], sheet: null })),
      replace: (r) => set((s) => ({ stack: [...s.stack.slice(0, -1), r], sheet: null })),
      tab: (name) => set({ stack: [{ name }], sheet: null }),
      back: () =>
        set((s) => ({ stack: s.stack.length > 1 ? s.stack.slice(0, -1) : [{ name: 'feed' }], sheet: null })),
      openSheet: (sheet) => set({ sheet }),
      closeSheet: () => set({ sheet: null }),
      showToast: (msg) => set({ toast: { msg, key: ++toastKey } }),

      openCamera: (opts) => {
        clearTimers();
        const s = get();
        const top = s.stack[s.stack.length - 1];
        const from = top.name === 'camera' ? s.capture.from : top;
        set({
          capture: { ...idleCapture, mode: opts?.mode ?? s.capture.mode, from },
          lastList: opts?.dest ?? s.lastList,
          stack: top.name === 'camera' ? s.stack : [...s.stack, { name: 'camera' }],
          sheet: null,
        });
      },
      closeCamera: () => {
        clearTimers();
        const s = get();
        const below = s.stack.slice(0, -1);
        set({
          capture: { ...idleCapture, mode: s.capture.mode },
          stack: below.length ? below : [s.capture.from ?? { name: 'feed' }],
        });
      },
      setCapture: (patch) => set((s) => ({ capture: { ...s.capture, ...patch } })),
      resetCapture: () => {
        clearTimers();
        captureRun++;
        const c = get().capture;
        if (c.fixItem != null) {
          // Came from the item's "Wrong product?" — go straight back to it.
          get().closeCamera();
          return;
        }
        set({ capture: { ...idleCapture, mode: c.mode, from: c.from } });
      },
      runCapture: async (input) => {
        clearTimers();
        // A new capture replaces the last add's receipt, as in the prototype.
        get().endFiling();
        const run = ++captureRun;
        const live = () => run === captureRun;
        const patch = (p: Partial<Capture>) => {
          if (live()) set((s) => ({ capture: { ...s.capture, ...p } }));
        };
        const miss = (m: Miss) => patch({ phase: 'nomatch', miss: m });
        if ((input.source === 'search' || input.source === 'voice') && input.query.trim()) {
          const q = input.query.trim().slice(0, 80);
          set((s) => ({ recentQueries: [q, ...s.recentQueries.filter((x) => x.toLowerCase() !== q.toLowerCase())].slice(0, 10) }));
        }
        set((s) => ({
          capture: {
            ...s.capture,
            star: false,
            size: '',
            sizeEditing: false,
            storesOpen: false,
            destOpen: false,
            chosen: 0,
            miss: null,
            match: null,
            alternates: [],
            input,
            typeHeard: false,
            fromRoll: input.source === 'screenshot',
            shotUri: 'uri' in input ? (input.uri ?? null) : null,
            shotThumb: 'thumb' in input ? (input.thumb ?? null) : null,
            variant: null,
            // A shutter press flashes first; everything else goes straight to matching.
            phase: input.source === 'photo' || input.source === 'barcode' ? 'snap' : 'scan',
            note: NOTES[input.source],
          },
        }));
        // After the shutter flash, show "reading…" — unless a fast answer already moved on.
        if (input.source === 'photo' || input.source === 'barcode') later(() => live() && get().capture.phase === 'snap' && patch({ phase: 'scan' }), 420);

        try {
          let found: Match[];
          if (input.source === 'photo' || input.source === 'screenshot') {
            if (!input.image) return miss(MISS.error(new Error('That photo couldn’t be read. Try again, or type it.')));
            const reading = await readPhoto(input.image);
            if (!live()) return;
            if (reading.problem !== 'none' || !reading.query) return miss(MISS.photo(reading.problem));
            // Show what it is now; stores and prices fill in when the search lands. "Want it" works meanwhile.
            const readConfidence = reading.confidence === 'high' ? 0.95 : reading.confidence === 'medium' ? 0.8 : 0.6;
            patch({ phase: 'found', match: { name: reading.name || reading.query, price: '', store: '', source: input.source, confidence: readConfidence, searching: true }, alternates: [] });
            early.set(run, { itemId: null, query: reading.query });
            try {
              found = await find({ source: input.source, query: reading.query, hint: [reading.name, reading.detail].filter(Boolean).join(', ') });
            } catch (e) {
              if (landEarly(run, [], input)) return;
              throw e;
            }
            // The reading's own confidence caps how sure the match can claim to be.
            if (found[0] && reading.confidence !== 'high') found[0] = { ...found[0], confidence: Math.min(found[0].confidence ?? 1, readConfidence) };
            if (landEarly(run, found, input)) return;
          } else if (input.source === 'barcode') {
            found = await find({ source: 'barcode', upc: input.upc });
          } else if (input.source === 'link') {
            found = await find({ source: 'link', url: input.url });
            if (live() && !found.length) return miss(MISS.badlink());
          } else {
            found = 'query' in input ? await find({ source: input.source, query: input.query }) : [];
          }
          if (!live()) return;
          if (!found.length) return miss(MISS.nothing(input.source === 'barcode' ? 'that barcode' : 'that'));
          patch({ phase: 'found', match: found[0], alternates: found });
          fillImage(found[0]);
        } catch (e) {
          miss(MISS.error(e));
        }
      },
      openAlternates: async (itemId, query) => {
        const item = get().items.find((i) => i.id === itemId);
        if (!item) return;
        if (get().stack[get().stack.length - 1].name !== 'camera') get().openCamera();
        const run = ++captureRun;
        set((s) => ({ capture: { ...s.capture, fixItem: itemId, phase: 'scan', note: query ? 'searching stores' : 'finding close matches', miss: null } }));
        try {
          // A pending photo has no name yet, so "close matches" means searching what it was saved as.
          const found = query
            ? await find({ source: 'search', query })
            : item.pending && !item.query
              ? []
              : await find({ source: 'alternates', query: item.query || item.name });
          if (run !== captureRun) return;
          if (!found.length) {
            set((s) => ({ capture: { ...s.capture, phase: 'nomatch', miss: MISS.nothing(`“${item.name}”`) } }));
            return;
          }
          set((s) => ({ capture: { ...s.capture, phase: 'alts', alternates: found } }));
        } catch (e) {
          if (run === captureRun) set((s) => ({ capture: { ...s.capture, phase: 'nomatch', miss: MISS.error(e) } }));
        }
      },
      pickVariant: (v) => {
        const m = get().capture.match;
        if (!m?.url) return;
        // Storage, scent and the like look the same: just record the choice.
        if (m.optionChangesLook === false) {
          set((st) => ({ capture: { ...st.capture, variant: v } }));
          return;
        }
        const own = v === m.color;
        const cached = variantPhotos.get(photoKey(m.url, v));
        set((st) => ({ capture: { ...st.capture, variant: v, match: st.capture.match ? { ...st.capture.match, image: cached ?? (own ? variantPhotos.get(photoKey(m.url!, m.color)) : undefined) } : null } }));
        // A different colour than the listing: its store pages show the wrong one, so search only.
        if (!cached) fillImage(m, v, own);
      },
      wantIt: () => {
        const s = get();
        const m = s.capture.match;
        if (!m) return;
        if (m.searching) {
          // Saved before the search finished: file it now as "finding stores…"; the search result fills it in.
          const pend = early.get(captureRun);
          const id = get().addItem({
            list: s.lastList,
            name: m.name,
            price: '—',
            store: 'finding stores…',
            upc: '—',
            photo: s.capture.shotThumb ?? undefined,
            added: `by camera · ${shortDate(Date.now())}`,
            star: s.capture.star,
            size: s.capture.size.trim() || undefined,
            pending: true,
            query: pend?.query,
            alert: true,
          });
          if (pend) pend.itemId = id;
          set((st) => ({ firstRun: false, capture: { ...st.capture, phase: 'fly', match: m } }));
          later(() => {
            set((st) => ({ capture: { ...idleCapture, mode: st.capture.mode, from: st.capture.from } }));
            startFiling(id);
          }, 480);
          return;
        }
        const how: Record<string, string> = {
          barcode: 'scanned',
          link: 'from a link',
          catalog: 'from trending',
          search: 'searched',
          photo: 'by camera',
          voice: 'dictated',
          screenshot: 'from a screenshot',
        };
        const id = get().addItem({
          list: s.lastList,
          name: m.name,
          price: m.price,
          store: m.store,
          upc: m.upc ?? '—',
          url: m.url,
          image: m.image,
          photo: s.capture.shotThumb ?? undefined,
          others: m.others,
          checkedAt: Date.now(),
          added: `${how[m.source] ?? 'by camera'} · ${shortDate(Date.now())}`,
          star: s.capture.star,
          size: withVariant(m, s.capture.variant, s.capture.size),
          alert: true,
        });
        set((st) => ({ firstRun: false, capture: { ...st.capture, phase: 'fly', match: m } }));
        later(() => {
          set((st) => ({ capture: { ...idleCapture, mode: st.capture.mode, from: st.capture.from } }));
          startFiling(id);
        }, 480);
      },
      savePending: () => {
        const s = get();
        const input = s.capture.input;
        const id = s.nextId;
        const query = input && 'query' in input ? input.query : undefined;
        const name =
          input?.source === 'link' ? 'Saved link — pick the product' : input?.source === 'voice' || input?.source === 'search' ? `“${query}” — matching…` : 'Your photo — matching…';
        set((st) => ({
          items: [
            {
              id,
              list: st.lastList,
              name,
              price: '—',
              store: 'saved for later',
              upc: '—',
              added: `${input?.source === 'link' ? 'link' : input?.source === 'voice' ? 'said' : 'photo'} saved · ${shortDate(Date.now())}`,
              createdAt: Date.now(),
              pending: true,
              query,
              url: input?.source === 'link' ? input.url : undefined,
              photo: s.capture.shotThumb ?? undefined,
            },
            ...st.items,
          ],
          nextId: st.nextId + 1,
          firstRun: false,
          capture: { ...idleCapture, mode: st.capture.mode, from: st.capture.from },
        }));
        // Keep matching in the background, more thoroughly than a live capture can
        // afford; if it lands, ask "We think we found it".
        void rematch(id, input);
      },
      fixWith: (m) => {
        const id = get().capture.fixItem;
        if (id == null) return;
        get().updateItem(id, {
          name: m.name,
          price: m.price,
          store: m.store,
          url: m.url,
          image: m.image,
          imageTried: false,
          upc: m.upc ?? '—',
          others: m.others,
          checkedAt: Date.now(),
          pending: false,
          suggest: null,
        });
        fillImage(m);
        get().closeCamera();
        get().showToast(`Fixed — now ${m.name}`);
      },
      undoFiling: () => {
        const f = get().filing;
        if (filingTimer) clearTimeout(filingTimer);
        if (f) set((s) => ({ items: s.items.filter((i) => i.id !== f.itemId) }));
        set({ filing: null });
        get().showToast('Undone. Never happened.');
      },
      endFiling: () => {
        if (filingTimer) clearTimeout(filingTimer);
        set({ filing: null });
      },

      addItem: (it, opts) => {
        const id = get().nextId;
        set((s) => ({ items: [{ ...it, id, createdAt: Date.now() }, ...s.items], nextId: s.nextId + 1 }));
        if (opts?.file) startFiling(id);
        return id;
      },
      updateItem: (id, patch) => set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
      removeItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),

      createList: ({ name, vis, accent, date }) => {
        const id = `l${Date.now().toString(36)}`;
        set((s) => ({ lists: [...s.lists, { id, name, vis, accent, date, linkToken: token(), linkSince: Date.now(), linkExpiry: date ? 'date' : 'always' }] }));
        return id;
      },
      updateList: (id, patch) => set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, ...patch } : l)) })),
      setVis: (id, vis) =>
        set((s) => ({
          // Leaving Friends + link kills the link at once (spec).
          lists: s.lists.map((l) => (l.id === id ? { ...l, vis, ...(l.vis === 'invite' && vis !== 'invite' ? { linkToken: token(), linkSince: Date.now() } : {}) } : l)),
        })),
      archiveList: (id) => set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, archived: true } : l)) })),
      deleteList: (id) =>
        set((s) => ({
          lists: s.lists.filter((l) => l.id !== id),
          items: s.items.filter((i) => i.list !== id),
          lastList: s.lastList === id ? 'w' : s.lastList,
        })),
      resetLink: (id) =>
        set((s) => ({ lists: s.lists.map((l) => (!id || l.id === id ? { ...l, linkToken: token(), linkSince: Date.now() } : l)) })),

      syncFriends: async () => {
        const s0 = get();
        if (!s0.phone) return;
        const r = await fetchSync(s0.ownerSecret);
        if (!r.ok) {
          if (r.code === 'signed_out') set({ phone: null });
          return;
        }
        set((s) => applyFriends(s, r));
      },
      sendRequest: async (uid, name) => {
        const r = await friendAction(get().ownerSecret, { action: 'request', uid });
        if (!r.ok) return r.message;
        get().showToast(r.state === 'friends' ? `You and ${name} are friends` : `Request sent — ${name} has to accept`);
        void get().syncFriends();
        return null;
      },
      acceptRequest: async (uid) => {
        const who = get().requests.find((x) => x.id === uid)?.name ?? 'them';
        set((s) => ({ requests: s.requests.filter((x) => x.id !== uid) }));
        const r = await friendAction(get().ownerSecret, { action: 'accept', uid });
        get().showToast(r.ok ? `${who} added — they see your Friends lists` : r.message);
        await get().syncFriends();
      },
      declineRequest: async (uid) => {
        const who = get().requests.find((x) => x.id === uid)?.name ?? 'them';
        set((s) => ({ requests: s.requests.filter((x) => x.id !== uid) }));
        await friendAction(get().ownerSecret, { action: 'decline', uid });
        get().showToast(`Declined — ${who} won’t be told`);
      },
      cancelInvite: async (uid) => {
        set((s) => ({ sent: s.sent.filter((x) => x.id !== uid) }));
        await friendAction(get().ownerSecret, { action: 'cancel', uid });
        get().showToast('Request cancelled');
      },
      toggleAccess: (friendId, listId) => {
        const f = get().friends.find((x) => x.id === friendId);
        if (!f) return;
        const on = f.access[listId] === false;
        set((s) => ({ friends: s.friends.map((x) => (x.id === friendId ? { ...x, access: { ...x.access, [listId]: on } } : x)) }));
        void friendAction(get().ownerSecret, { action: 'access', uid: friendId, list: listId, on }).then((r) => {
          if (!r.ok) {
            get().showToast(r.message);
            void get().syncFriends();
          }
        });
      },
      removeFriend: async (uid) => {
        set((s) => dropFriend(s, uid));
        await friendAction(get().ownerSecret, { action: 'remove', uid });
      },
      blockFriend: async (uid) => {
        set((s) => ({ ...dropFriend(s, uid), requests: s.requests.filter((x) => x.id !== uid), sent: s.sent.filter((x) => x.id !== uid) }));
        await friendAction(get().ownerSecret, { action: 'block', uid });
      },
      setFindByPhone: (on) => {
        set({ findByPhone: on });
        void friendAction(get().ownerSecret, { action: 'settings', findByPhone: on }).then((r) => {
          if (!r.ok) {
            set({ findByPhone: !on });
            get().showToast(r.message);
          }
        });
      },

      wantToo: (id) => {
        const s = get();
        const f = s.feed.find((x) => x.id === id);
        if (!f || f.wanted) return;
        const who = s.friends.find((p) => p.id === f.friendId)?.name ?? 'a friend';
        set((st) => ({ feed: st.feed.map((x) => (x.id === id ? { ...x, wanted: true } : x)), feedLocal: { ...st.feedLocal, [id]: { ...st.feedLocal[id], wanted: true } }, sheet: null }));
        get().addItem(
          { list: 'w', name: f.name, price: f.price, store: f.store, url: f.url, image: f.image, upc: '—', added: `from ${who}'s wants · ${shortDate(Date.now())}`, alert: true },
          { file: true },
        );
      },
      loadIdeas: async (more) => {
        const s0 = get();
        if (!s0.phone) return;
        const next = s0.ideas.next ?? [];
        // The next page is usually ready: show it at once and start on the one after.
        if (more && next.length) {
          set((st) => {
            const have = new Set(st.ideas.cards.map((c) => c.id));
            return { ideas: { ...st.ideas, cards: [...st.ideas.cards, ...next.filter((c) => !have.has(c.id))], next: [] } };
          });
          void fillIdeaImages();
          void prefetchIdeas();
          return;
        }
        if (s0.ideasLoading) return;
        // The next page is still on its way: wait for it rather than ask twice.
        if (more && inflightPrefetch) {
          set({ ideasLoading: true, ideasError: null });
          await inflightPrefetch;
          set({ ideasLoading: false });
          if ((get().ideas.next ?? []).length) return get().loadIdeas(true);
        }
        set({ ideasLoading: true, ideasError: null });
        const budget = s0.ideas.budget;
        const shown = more ? s0.ideas.cards.map((c) => c.name) : [];
        const r = await fetchIdeas(s0.ownerSecret, buildSignals(s0, budget, shown), IDEAS_PAGE);
        if (!r.ok) {
          set({ ideasLoading: false, ideasError: r.message });
          return;
        }
        // The budget changed while this was on its way: it's the wrong page.
        if (get().ideas.budget !== budget) {
          set({ ideasLoading: false });
          return;
        }
        set((st) => {
          const old = more ? st.ideas.cards : [];
          const have = new Set(old.map((c) => c.id));
          return { ideasLoading: false, ideas: { ...st.ideas, cards: [...old, ...r.ideas.filter((i) => !have.has(i.id))], next: more ? st.ideas.next : [], themes: r.themes, at: Date.now() } };
        });
        void fillIdeaImages();
        void prefetchIdeas();
      },
      setIdeaBudget: (budget) => {
        set((st) => ({ ideas: { ...st.ideas, budget, cards: [], next: [] } }));
        void get().loadIdeas();
      },
      wantIdea: (id) => {
        const s = get();
        const card = s.ideas.cards.find((c) => c.id === id);
        if (!card || card.state) return;
        const itemId = s.addItem({
          list: 'w',
          name: card.name,
          price: '—',
          store: 'finding stores…',
          upc: '—',
          image: card.image,
          added: `from Ideas · ${shortDate(Date.now())}`,
          pending: true,
          query: card.query,
          alert: true,
        });
        set((st) => ({
          ideas: { ...st.ideas, cards: st.ideas.cards.map((c) => (c.id === id ? { ...c, state: 'wanted' } : c)) },
          ideaFeedback: { ...st.ideaFeedback, liked: [card.name, ...st.ideaFeedback.liked.filter((n) => n !== card.name)].slice(0, 40) },
        }));
        get().showToast('In My wants — finding the best price');
        void find({ source: 'search', query: card.query })
          .then((found) => {
            const best = found[0];
            if (!best) {
              get().updateItem(itemId, { store: 'saved for later' });
              return;
            }
            get().updateItem(itemId, { name: best.name, price: best.price, store: best.store, url: best.url, image: best.image ?? card.image, upc: best.upc ?? '—', others: best.others, checkedAt: Date.now(), pending: false });
            fillImage({ ...best, image: best.image ?? card.image });
          })
          .catch(() => get().updateItem(itemId, { store: 'saved for later' }));
      },
      dismissIdea: (id) => {
        const card = get().ideas.cards.find((c) => c.id === id);
        if (!card) return;
        set((st) => ({
          ideas: { ...st.ideas, cards: st.ideas.cards.map((c) => (c.id === id ? { ...c, state: 'dismissed' } : c)) },
          ideaFeedback: { ...st.ideaFeedback, disliked: [card.name, ...st.ideaFeedback.disliked.filter((n) => n !== card.name)].slice(0, 60) },
        }));
      },
      toggleFriendDibs: async (listId, itemId) => {
        const s = get();
        const list = s.friendLists.find((l) => l.id === listId);
        const item = list?.items.find((i) => i.id === itemId);
        if (!list || !item || item.itemId == null || !list.listId) return;
        const claim = !s.friendDibs[itemId];
        set((st) => ({ friendDibs: { ...st.friendDibs, [itemId]: claim } }));
        const r = await friendAction(s.ownerSecret, { action: 'dibs', uid: list.friendId, list: list.listId, itemId: item.itemId, claim });
        if (!r.ok) {
          set((st) => ({ friendDibs: { ...st.friendDibs, [itemId]: !claim } }));
          get().showToast(r.message);
        } else if (claim) {
          get().showToast(`Dibs called — ${s.friends.find((f) => f.id === list.friendId)?.name ?? 'they'} will never know`);
        }
        void get().syncFriends();
      },
      setGifterName: (gifterName) => set({ gifterName }),
      toggleGifterDibs: (itemId) => set((s) => ({ gifterDibs: { ...s.gifterDibs, [itemId]: !s.gifterDibs[itemId] } })),

      markRead: (id) => set((s) => ({ notifs: s.notifs.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
      markAllRead: () => set((s) => ({ notifs: s.notifs.map((n) => ({ ...n, read: true })) })),

      setProfile: (patch) => set((s) => ({ profile: { ...s.profile, ...patch } })),
      finishOnboarding: ({ handle, birthday, parent, privateDefault }) =>
        set((s) => ({
          onboarded: true,
          profile: {
            ...s.profile,
            handle,
            birthdaySet: true,
            // There's no name step: gifters see the handle until a name is set.
            name: s.profile.name || handle,
            birthday,
            parent: parent.trim()
              ? { on: true, approve: true, name: 'Parent', contact: parent.trim(), since: Date.now() }
              : null,
          },
          lists: privateDefault ? s.lists.map((l) => (l.id === 'w' ? { ...l, vis: 'me' } : l)) : s.lists,
          stack: [{ name: 'feed' }],
        })),
      applySignIn: (r) => {
        const s0 = get();
        const patch: Partial<AppState> = { ownerSecret: r.secret, phone: { last2: r.phoneLast2, verifiedAt: Date.now() } };
        if (r.kind === 'restored' && r.birth && MONTHS[r.birth.month - 1]) {
          patch.profile = { ...s0.profile, birthday: { month: MONTHS[r.birth.month - 1], day: r.birth.day, year: r.birth.year }, birthdaySet: true };
        }
        if (r.kind === 'restored' && r.handle) {
          patch.profile = { ...(patch.profile ?? s0.profile), handle: r.handle, name: r.page?.name || s0.profile.name, sizes: r.page?.sizes ?? s0.profile.sizes };
          patch.publishedHandle = r.handle;
        }
        const shared = r.kind === 'restored' ? (r.page?.lists ?? []) : [];
        if (shared.length) {
          // Bring back the lists this account had shared: replace any local list with
          // the same id, and give their shinies fresh ids so nothing collides.
          let nextId = s0.nextId;
          const ids = new Set(shared.map((l) => l.id));
          const restoredItems: Item[] = shared.flatMap((l) =>
            l.items.map((i) => ({
              id: nextId++,
              list: l.id,
              name: i.name,
              price: i.price,
              store: i.store,
              url: i.url,
              image: i.image,
              size: i.size,
              note: i.note,
              star: i.star,
              pending: i.pending,
              upc: '—',
              added: 'restored',
              createdAt: Date.now(),
              alert: true,
            })),
          );
          const restoredLists: WishList[] = shared.map((l) => {
            const local = s0.lists.find((x) => x.id === l.id);
            return { ...(local ?? { accent: l.id === 'w' ? '#c8f542' : '#ff5da2', linkExpiry: 'always' as const }), id: l.id, name: l.name, note: l.note, vis: (l.friendsOnly ? 'friends' : 'invite') as Vis, linkToken: l.token, linkSince: local?.linkSince ?? Date.now() };
          });
          patch.lists = [...s0.lists.filter((l) => !ids.has(l.id)), ...restoredLists];
          patch.items = [...restoredItems, ...s0.items.filter((i) => !ids.has(i.list))];
          patch.nextId = nextId;
        }
        set(patch);
      },
      finishCleanup: ({ got, kept }) =>
        set((st) => ({
          // "Got it" removes; "Still want" moves to My wants; unsorted stays.
          items: st.items.filter((i) => !got.includes(i.id)).map((i) => (kept.includes(i.id) ? { ...i, list: 'w' } : i)),
          cleanupYear: new Date().getFullYear(),
          sheet: null,
        })),
    }),
    {
      name: 'melikee',
      version: 4,
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => {
        const { stack, sheet, toast, capture, filing, publishState, ideasLoading, ideasError, ...rest } = s;
        void publishState;
        void ideasLoading;
        void ideasError;
        void stack;
        void sheet;
        void toast;
        void capture;
        void filing;
        return Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as Partial<AppState>;
      },
      // v2 → v3: same shape, minus the demo content earlier builds seeded.
      // v3 → v4: Birthday and Christmas lists. Anything older starts over.
      migrate: (old, version) => {
        if (!old || version < 2) return freshContent() as unknown as AppState;
        // Fill anything missing from fresh defaults, so a partial store can't break the app.
        const full = { ...freshContent(), ...(old as Partial<Content>) } as Content & { request?: unknown };
        // v2's single sample friend request; requests come from the server now.
        delete full.request;
        const v3 = version === 2 ? cleanSample(full) : full;
        return addDefaultLists(v3) as unknown as AppState;
      },
    },
  ),
);

/**
 * Takes the prototype's demo cast (Maya, Ava, Jordan…) off an account made by
 * an earlier build, keeping everything the person added themselves.
 */
export function cleanSample(c: Content): Content {
  const drop = <T extends { id: string }>(list: T[] | undefined, ids: string[]) => (list ?? []).filter((x) => !ids.includes(x.id));
  const p = c.profile;
  const sampleProfile = p.name === 'Maya';
  return {
    ...c,
    profile: {
      ...p,
      name: sampleProfile ? p.handle : p.name,
      parent: p.parent?.name === 'Jen (Mom)' ? null : p.parent,
      email: p.email === 'maya@…' ? '' : p.email,
    },
    items: c.items.filter((i) => SAMPLE.items[i.id] !== i.name),
    friends: drop(c.friends, SAMPLE.friends),
    friendLists: drop(c.friendLists, SAMPLE.friendLists),
    friendDibs: {},
    feed: drop(c.feed, SAMPLE.feed),
    contacts: drop(c.contacts, SAMPLE.contacts),
    sent: drop(c.sent, SAMPLE.sent),
    linkHolders: drop(c.linkHolders, SAMPLE.linkHolders),
    notifs: drop(c.notifs, SAMPLE.notifs),
  };
}

/**
 * v3 → v4: the birthday list is just "Birthday" (no more "Sweet 16"), and
 * everyone gets a Christmas list. Whether the birthday was ever given isn't
 * recorded before v4; the placeholder Oct 14 means it probably wasn't.
 */
export function addDefaultLists(c: Content): Content {
  const lists = c.lists.map((l) => (l.isBirthday && l.name === 'Sweet 16' ? { ...l, name: 'Birthday' } : l));
  const hasXmas = lists.some((l) => l.id === 'xmas' || (l.date?.month === 'Dec' && l.date.day === 25));
  if (!hasXmas) {
    const at = lists.findIndex((l) => l.isBirthday);
    lists.splice(at >= 0 ? at + 1 : lists.length, 0, christmasList());
  }
  const b = c.profile.birthday;
  return { ...c, lists, profile: { ...c.profile, birthdaySet: c.profile.birthdaySet ?? !(b.month === 'Oct' && b.day === 14) } };
}

/**
 * Background matching for a saved shiny: one thorough search (more searches,
 * more effort than a live capture can wait for). If it lands, the shiny gets a
 * suggestion and a "We think we found it" notification; if not, it stays
 * pending and "Pick it myself" is always there.
 */
async function rematch(id: number, input: CaptureInput | null) {
  try {
    let query = input && 'query' in input ? input.query : undefined;
    let hint: string | undefined;
    if (!query && input && 'image' in input && input.image) {
      const reading = await readPhoto(input.image);
      if (reading.problem !== 'none' || !reading.query) return;
      query = reading.query;
      hint = [reading.name, reading.detail].filter(Boolean).join(', ');
    }
    const found = input?.source === 'link' ? await find({ source: 'link', url: input.url, thorough: true }) : query ? await find({ source: 'search', query, hint, thorough: true }) : [];
    const best = found[0];
    const it = useApp.getState().items.find((i) => i.id === id);
    if (!best || !it || !it.pending) return;
    const suggest = { name: best.name, price: best.price, store: best.store, url: best.url, image: best.image, upc: best.upc, others: best.others };
    useApp.setState((st) => ({
      items: st.items.map((i) => (i.id === id ? { ...i, suggest } : i)),
      notifs: [
        { id: `match-${id}`, kind: 'match', title: 'We think we found it', sub: `${best.name} · ${best.price} — is this right?`, at: Date.now(), read: false, to: { name: 'item', id } },
        ...st.notifs,
      ],
    }));
    fillImage(best);
  } catch {
    // Stays pending; the item screen offers "Pick it myself".
  }
}

// ——— friends ———

const FEED_DAYS = 60;
const FEED_MAX = 50;
const BDAY_NOTICE_DAYS = 14;

/** Drop a friend and everything they shared, locally (the server is told separately). */
function dropFriend(s: AppState): Partial<AppState>;
function dropFriend(s: AppState, uid: string): Partial<AppState>;
function dropFriend(s: AppState, uid?: string): Partial<AppState> {
  return {
    friends: s.friends.filter((f) => f.id !== uid),
    friendLists: s.friendLists.filter((l) => l.friendId !== uid),
    feed: s.feed.filter((f) => f.friendId !== uid),
  };
}

const initialOf = (name: string) => (name.trim()[0] ?? '?').toUpperCase();

/**
 * Turn a server sync into the app's friends, their lists, the Feed, requests
 * and invites; and raise notifications for what's new since the last sync:
 * a request, an accepted request, a friend's birthday coming up.
 */
function applyFriends(s: AppState, r: SyncResponse): Partial<AppState> {
  const now = Date.now();
  const friends: Friend[] = r.friends.map((f) => ({
    id: f.uid,
    name: f.name,
    handle: f.handle,
    initial: initialOf(f.name),
    birthday: parseLabel(f.birthday) ?? { month: 'Jan', day: 1 },
    access: f.access,
  }));
  const friendDibs: Record<string, boolean> = {};
  const friendLists: FriendList[] = r.friends.flatMap((f) =>
    f.lists.map((l) => ({
      id: `${f.uid}:${l.id}`,
      friendId: f.uid,
      listId: l.id,
      name: l.name,
      isBirthday: l.isBirthday,
      date: l.date,
      items: l.items.map((i) => {
        const id = `${f.uid}:${l.id}:${i.id}`;
        const d = l.dibs[String(i.id)];
        if (d?.mine) friendDibs[id] = true;
        return { id, itemId: i.id, name: i.name, price: i.price, store: i.store, url: i.url, image: i.image, star: i.star, pending: i.pending, taken: !!d && !d.mine, takenBy: d && !d.mine ? d.name : undefined };
      }),
    })),
  );
  const feed: FeedEntry[] = r.friends
    .flatMap((f) =>
      f.lists.flatMap((l) =>
        l.items
          .filter((i) => i.at && now - i.at < FEED_DAYS * 864e5 && !i.pending)
          .map((i) => {
            const id = `${f.uid}:${l.id}:${i.id}`;
            const local = s.feedLocal[id];
            return { id, friendId: f.uid, list: l.name, name: i.name, price: i.price, store: i.store, url: i.url, image: i.image, at: i.at!, hearts: 0, myHeart: !!local?.heart, wanted: !!local?.wanted };
          }),
      ),
    )
    .sort((a, b) => b.at - a.at)
    .slice(0, FEED_MAX);
  const requests: FriendRequest[] = r.incoming.map((p) => ({ id: p.uid, handle: p.handle, name: p.name, initial: initialOf(p.name), mutual: 0, birthday: parseLabel(p.birthday) ?? { month: 'Jan', day: 1 }, state: 'pending', access: {} }));
  const sent: SentInvite[] = r.outgoing.map((p) => ({ id: p.uid, handle: p.handle, name: p.name, initial: initialOf(p.name), at: p.at }));

  // What's new.
  const have = new Set(s.notifs.map((n) => n.id));
  const fresh: Notif[] = [];
  if (s.notifSettings.req) {
    for (const p of r.incoming) {
      const id = `req-${p.uid}-${p.at}`;
      if (!have.has(id)) fresh.push({ id, kind: 'req', title: `${p.name} wants to be friends`, sub: `@${p.handle} · tap to accept or decline`, at: p.at, read: false, to: { name: 'people' } });
    }
    const wasSent = new Set(s.sent.map((x) => x.id));
    for (const f of r.friends) {
      const id = `acc-${f.uid}-${f.since}`;
      if (wasSent.has(f.uid) && !have.has(id)) fresh.push({ id, kind: 'req', title: `${f.name} accepted your request`, sub: 'their lists are in your Feed now', at: now, read: false, to: { name: 'people' } });
    }
  }
  if (s.notifSettings.bday) {
    for (const f of friends) {
      const days = daysUntil(f.birthday);
      const id = `bday-${f.id}-${new Date(now + days * 864e5).getFullYear()}`;
      if (days <= BDAY_NOTICE_DAYS && !have.has(id)) {
        const list = friendLists.find((l) => l.friendId === f.id && l.isBirthday) ?? friendLists.find((l) => l.friendId === f.id);
        const open = list ? list.items.filter((i) => !i.taken && !friendDibs[i.id] && !i.pending).length : 0;
        fresh.push({
          id,
          kind: 'bday',
          title: days === 0 ? `It’s ${f.name}’s birthday today` : `${f.name}’s birthday is in ${days} day${days === 1 ? '' : 's'}`,
          sub: list ? `${open} ${open === 1 ? 'shiny' : 'shinies'} still up for dibs` : 'say happy birthday',
          at: now,
          read: false,
          to: list ? { name: 'friendList', id: list.id } : { name: 'people' },
        });
      }
    }
  }

  return {
    friends,
    friendLists,
    friendDibs,
    feed,
    requests,
    sent,
    findByPhone: r.me.findByPhone,
    notifs: fresh.length ? [...fresh, ...s.notifs] : s.notifs,
  };
}

/** Photo captures shown before their search finished, by capture run. */
const early = new Map<number, { itemId: number | null; query: string }>();

/**
 * The search for an early-shown photo capture has landed (or failed: `found`
 * empty). If the shiny was already saved, fill it in and return true. If the
 * found sheet is still waiting, return false and let the capture carry on.
 * If the person moved on (typing, closed it), drop the result and return true.
 */
function landEarly(run: number, found: Match[], input: CaptureInput): boolean {
  const pend = early.get(run);
  if (!pend) return false;
  early.delete(run);
  if (pend.itemId != null) {
    const id = pend.itemId;
    const best = found[0];
    if (best) {
      useApp.getState().updateItem(id, {
        name: best.name,
        price: best.price,
        store: best.store,
        url: best.url,
        image: best.image,
        upc: best.upc ?? '—',
        others: best.others,
        checkedAt: Date.now(),
        pending: false,
      });
      fillImage(best);
    } else {
      // Nothing yet: it stays "saved for later" and keeps looking, more thoroughly.
      useApp.getState().updateItem(id, { store: 'saved for later' });
      void rematch(id, input);
    }
    return true;
  }
  const c = useApp.getState().capture;
  return !(run === captureRun && c.phase === 'found' && c.match?.searching);
}

/**
 * Store listings often come back without a picture. Look one up in the
 * background and put it wherever that listing is showing: the found sheet,
 * the alternates, saved shinies and suggestions with the same link.
 */
const imageLookups = new Set<string>();
/** Photos found per listing and colour, so flipping between colours is instant. */
const variantPhotos = new Map<string, string>();
const photoKey = (url: string, variant?: string | null) => `${url}|${(variant ?? '').toLowerCase()}`;

/** The colour (if it isn't already in the name) and any size typed, for the shiny's "Size / color". */
function withVariant(m: Match, picked: string | null, typed: string) {
  const colour = picked ?? m.color;
  const show = colour && !m.name.toLowerCase().includes(colour.toLowerCase()) ? colour : '';
  return [show, typed.trim()].filter(Boolean).join(', ') || undefined;
}

export function fillImage(m: { name: string; url?: string; image?: string; color?: string; others?: StoreOffer[] }, variant?: string, useStorePages = true) {
  if (!m.url) return;
  const url = m.url;
  const colour = variant ?? m.color;
  if (m.image && !variant) {
    variantPhotos.set(photoKey(url, colour), m.image);
    return;
  }
  const key = photoKey(url, colour);
  if (imageLookups.has(key)) return;
  imageLookups.add(key);
  const tried = (i: Item) => (i.url === url && !i.image ? { ...i, imageTried: true } : i);
  imageFor(m, colour, useStorePages)
    .then((image) => {
      if (image) variantPhotos.set(key, image);
      useApp.setState((st) => {
        if (!image) return { items: st.items.map(tried) };
        const put = <T extends { url?: string; image?: string }>(x: T): T => (x.url === url && !x.image ? { ...x, image } : x);
        const c = st.capture;
        // The found sheet follows whichever colour is picked now.
        const showing = c.match?.url === url && photoKey(url, c.variant ?? c.match.color) === key;
        return {
          items: st.items.map((i) => {
            const j = tried(put(i));
            return j.suggest ? { ...j, suggest: put(j.suggest) } : j;
          }),
          capture: { ...c, match: showing && c.match ? { ...c.match, image } : c.match, alternates: c.alternates.map(put) },
        };
      });
    })
    .catch(() => undefined)
    .finally(() => imageLookups.delete(key));
}

/** Ideas come in pages of this many. */
const IDEAS_PAGE = 20;
/** A batch older than this is refreshed (in the background at launch, or when the tab opens). */
export const IDEAS_STALE_MS = 12 * 3600 * 1000;

/**
 * Fetch the page after what's showing into `ideas.next`, quietly (no
 * skeletons), so reaching the end of the scroll shows it at once.
 */
let inflightPrefetch: Promise<void> | null = null;
function prefetchIdeas(): Promise<void> {
  if (inflightPrefetch) return inflightPrefetch;
  const s0 = useApp.getState();
  if (!s0.phone || (s0.ideas.next ?? []).length || !s0.ideas.cards.length) return Promise.resolve();
  inflightPrefetch = fetchNextPage().finally(() => {
    inflightPrefetch = null;
  });
  return inflightPrefetch;
}

async function fetchNextPage() {
  const s0 = useApp.getState();
  const budget = s0.ideas.budget;
  const shown = s0.ideas.cards.map((c) => c.name);
  const r = await fetchIdeas(s0.ownerSecret, buildSignals(s0, budget, shown), IDEAS_PAGE);
  if (!r.ok) return;
  useApp.setState((st) => {
    if (st.ideas.budget !== budget) return {};
    const have = new Set(st.ideas.cards.map((c) => c.id));
    return { ideas: { ...st.ideas, next: r.ideas.filter((i) => !have.has(i.id)) } };
  });
  void fillIdeaImages();
}

/** At launch: have the first page (and the one after) ready before the tab is opened. */
export function warmIdeas() {
  const st = useApp.getState();
  if (!st.ideas.cards.length || Date.now() - st.ideas.at > IDEAS_STALE_MS) void st.loadIdeas();
  else void prefetchIdeas();
}

/**
 * Photos for idea cards, three lookups at a time (each is a web search on the
 * server, cached for a week). Ideas whose photo can't be found keep their
 * coloured placeholder.
 */
const ideaImageTried = new Set<string>();
async function fillIdeaImages() {
  const next = () => {
    const { cards, next: later = [] } = useApp.getState().ideas;
    // What's on screen first, then the page waiting to be shown.
    return [...cards, ...later].find((c) => !c.image && !c.state && !ideaImageTried.has(c.id));
  };
  const worker = async () => {
    for (let c = next(); c; c = next()) {
      ideaImageTried.add(c.id);
      const image = await imageFor({ name: c.name }).catch(() => null);
      if (image) {
        const id = c.id;
        const put = (x: IdeaCard) => (x.id === id ? { ...x, image } : x);
        useApp.setState((st) => ({ ideas: { ...st.ideas, cards: st.ideas.cards.map(put), next: (st.ideas.next ?? []).map(put) } }));
      }
    }
  };
  await Promise.all([worker(), worker(), worker()]);
}

/** Once per launch: find photos for saved shinies that never got one (one at a time). */
let backfilled = false;
export async function backfillImages() {
  if (backfilled) return;
  backfilled = true;
  const todo = useApp.getState().items.filter((i) => !i.pending && !i.image && !i.imageTried && i.url);
  for (const i of todo.slice(0, 10)) {
    fillImage(i);
    // Let each lookup finish before the next; they're slow and not urgent.
    while (imageLookups.size) await new Promise((r) => setTimeout(r, 500));
  }
}

function startFiling(itemId: number) {
  if (filingTimer) clearTimeout(filingTimer);
  useApp.setState({ filing: { itemId, key: ++filingKey } });
  filingTimer = setTimeout(() => useApp.setState({ filing: null }), FILING_SECONDS * 1000);
}

// ——— selectors ———

export const visibleLists = (s: AppState) => s.lists.filter((l) => !l.archived);

export function listById(s: AppState, id: string): WishList {
  return s.lists.find((l) => l.id === id) ?? s.lists[0];
}

/** Countdown for a list: the birthday list follows the profile birthday. */
export function listDays(s: AppState, l: WishList): number | null {
  if (l.isBirthday) return daysUntil(s.profile.birthday);
  if (l.date) return daysUntil(l.date);
  return null;
}

export function listAccent(l: WishList) {
  return l.id === 'w' ? '#c8f542' : l.accent;
}

export function visWord(v: Vis) {
  return v === 'friends' ? 'Friends' : v === 'invite' ? 'Friends + link' : 'Private';
}

export function visSentence(v: Vis) {
  return v === 'friends' ? 'shared with friends' : v === 'invite' ? 'friends + anyone with the link' : 'private';
}

export function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function shinies(n: number) {
  return plural(n, 'shiny', 'shinies');
}

export function friendsWithAccess(s: AppState, listId: string) {
  // New friends see every Friends list; switching one off for someone records false.
  return s.friends.filter((f) => f.access[listId] !== false);
}

/** "2 friends + link", "Private · only you" — the chip under a list title. */
export function visSummary(s: AppState, l: WishList) {
  if (l.vis === 'me') return 'Private · only you';
  const n = friendsWithAccess(s, l.id).length;
  const fs = n ? plural(n, 'friend', 'friends') : 'no friends picked';
  return l.vis === 'invite' ? `${fs} + link` : fs;
}

