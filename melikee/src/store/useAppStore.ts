import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  avaList,
  me,
  seedDirectory,
  seedFeed,
  seedFriends,
  seedItems,
  seedLists,
  seedSentInvites,
} from '@/data/seed';
import type {
  DirectoryPerson,
  FeedPost,
  Friend,
  ProductMatch,
  RequestStatus,
  SentInvite,
  SheetKind,
  Shiny,
  Visibility,
  WishList,
} from '@/store/types';
import {
  highestId,
  markHydrated,
  PERSIST_KEY,
  PERSIST_VERSION,
  persistStorage,
  stripInlinePhotos,
} from '@/store/persistence';
import type { ThemePreference } from '@/theme/ThemeProvider';

/** How long the filing tray lingers before sliding away. */
export const FILING_SECONDS = 6;

/**
 * The top-level destinations. The camera is not a dock tab — it's what the
 * centre shutter takes you to — but it is a swipe stop, so it belongs here.
 */
export type Tab = 'camera' | 'lists' | 'feed' | 'friends' | 'me';

/**
 * Swipe order. The camera stays the leftmost stop, as the design settled; the
 * rest follow dock order so swiping and tapping agree.
 */
export const TAB_ORDER: Tab[] = ['camera', 'lists', 'feed', 'friends', 'me'];

type AppState = {
  /** Which top-level destination the shell is showing. */
  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  // ── Preferences ──────────────────────────────────────────────────────────
  themePreference: ThemePreference;
  /** Honours the OS setting by default; the reward ritual degrades to a fade. */
  reduceMotion: boolean;
  /** The onboarding sticker shows until the first successful capture. */
  firstRun: boolean;

  // ── Content ──────────────────────────────────────────────────────────────
  lists: WishList[];
  items: Shiny[];
  friends: Friend[];
  sentInvites: SentInvite[];
  directory: DirectoryPerson[];
  feed: FeedPost[];

  /** The list the last capture was filed into — the next capture's default. */
  lastListId: string;
  /** The shiny the filing tray is currently talking about. */
  filing: { itemId: string; secondsLeft: number } | null;

  /** Riley's inbound follow request, and which lists they'd get. */
  request: { status: RequestStatus; access: Record<string, boolean> };

  /** Dibs called on a friend's list, and on your own page as a gifter sees it. */
  friendDibs: Record<string, boolean>;
  gifterDibs: Record<string, boolean>;

  /** Share notes, per list — they render at the top of the public page. */
  notes: Record<string, string>;
  /** Whether the public link has been copied this session. */
  linkCopied: boolean;

  // ── Ephemeral UI ─────────────────────────────────────────────────────────
  toast: string | null;
  sheet: SheetKind | null;
  searchQuery: string;

  // ── Actions ──────────────────────────────────────────────────────────────
  setThemePreference: (p: ThemePreference) => void;
  setReduceMotion: (v: boolean) => void;

  /** Adds a match to the default list and opens the filing tray. */
  addShiny: (
    match: ProductMatch,
    opts?: { photoUri?: string; provenance?: string; checkedAt?: string },
  ) => string;
  /** Saves an unmatched photo so the wish is never lost. */
  savePendingPhoto: (photoUri?: string) => void;
  /** Copies someone else's find from the Feed into your own list. */
  wantFromFeed: (postId: string) => void;

  moveFiledItem: (listId: string) => void;
  toggleFiledSecret: () => void;
  undoFiledAdd: () => void;
  tickFiling: () => void;
  dismissFiling: () => void;

  removeItem: (id: string) => void;
  markGotIt: (id: string) => void;
  createList: (name: string, visibility: Visibility) => string;

  toggleReaction: (postId: string, kind: 'fire' | 'heart') => void;

  setFriendAccess: (friendId: string, listId: string, value: boolean) => void;
  removeFriend: (friendId: string) => void;
  blockFriend: (friendId: string) => void;
  cancelInvite: (inviteId: string) => void;
  sendRequest: (personId: string) => void;
  setSearchQuery: (q: string) => void;

  answerRequest: (status: RequestStatus) => void;
  setRequestAccess: (listId: string, value: boolean) => void;

  toggleFriendDibs: (itemId: string) => void;
  toggleGifterDibs: (itemId: string) => void;

  setNote: (listId: string, note: string) => void;
  markLinkCopied: () => void;

  showToast: (message: string) => void;
  clearToast: () => void;
  openSheet: (sheet: SheetKind) => void;
  closeSheet: () => void;
};

let idCounter = 100;
const nextId = () => String(idCounter++);

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'camera',
      setActiveTab: (activeTab) => set({ activeTab }),

      // Dark is the brand's home ground — the design was built on it and every
      // glow, sticker and sparkle is tuned for it. Light mode is a real, complete
      // theme, but it's a choice rather than the default a light phone imposes.
      themePreference: 'dark',
      reduceMotion: false,
      firstRun: true,

      lists: seedLists,
      items: seedItems,
      friends: seedFriends,
      sentInvites: seedSentInvites,
      directory: seedDirectory,
      feed: seedFeed,

      lastListId: 'w',
      filing: null,

      request: { status: 'pending', access: { w: true, s16: false } },

      friendDibs: {},
      gifterDibs: {},

      notes: {},
      linkCopied: false,

      toast: null,
      sheet: null,
      searchQuery: '',

      setThemePreference: (themePreference) => set({ themePreference }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),

      addShiny: (match, opts) => {
        const id = nextId();
        const item: Shiny = {
          id,
          listId: get().lastListId,
          name: match.name,
          price: match.price,
          store: match.storeName,
          upc: match.upc,
          provenance: opts?.provenance ?? 'just now',
          secret: false,
          photoUri: opts?.photoUri,
          buyUrl: match.buyUrl,
          checkedAt: opts?.checkedAt,
          otherStores: match.otherStores,
        };
        set((s) => ({
          items: [item, ...s.items],
          firstRun: false,
          filing: { itemId: id, secondsLeft: FILING_SECONDS },
        }));
        return id;
      },

      savePendingPhoto: (photoUri) => {
        const id = nextId();
        set((s) => ({
          items: [
            {
              id,
              listId: s.lastListId,
              name: 'Your photo — matching…',
              price: '—',
              store: 'saved for later',
              upc: '—',
              provenance: 'as a photo, still matching',
              secret: false,
              photoUri,
              pending: true,
            },
            ...s.items,
          ],
          firstRun: false,
        }));
        get().showToast('Saved — we’ll keep matching it');
      },

      wantFromFeed: (postId) => {
        const post = get().feed.find((p) => p.id === postId);
        if (!post || post.wanted) return;
        const id = nextId();
        set((s) => ({
          feed: s.feed.map((p) => (p.id === postId ? { ...p, wanted: true } : p)),
          items: [
            {
              id,
              listId: s.lastListId,
              name: post.productName,
              price: post.productPrice,
              store: 'from the Feed',
              upc: '—',
              provenance: `from ${post.who}'s wants`,
              secret: false,
            },
            ...s.items,
          ],
          filing: { itemId: id, secondsLeft: FILING_SECONDS },
        }));
      },

      moveFiledItem: (listId) => {
        const filing = get().filing;
        if (!filing) return;
        const list = get().lists.find((l) => l.id === listId);
        set((s) => ({
          lastListId: listId,
          items: s.items.map((i) => (i.id === filing.itemId ? { ...i, listId } : i)),
        }));
        if (list) get().showToast(`Moved to ${list.name}`);
      },

      toggleFiledSecret: () => {
        const filing = get().filing;
        if (!filing) return;
        set((s) => ({
          items: s.items.map((i) => (i.id === filing.itemId ? { ...i, secret: !i.secret } : i)),
        }));
      },

      undoFiledAdd: () => {
        const filing = get().filing;
        if (!filing) return;
        set((s) => ({ items: s.items.filter((i) => i.id !== filing.itemId), filing: null }));
        get().showToast('Undone. Never happened.');
      },

      tickFiling: () =>
        set((s) => {
          if (!s.filing) return s;
          const secondsLeft = s.filing.secondsLeft - 1;
          if (secondsLeft <= 0) return { filing: null };
          return { filing: { ...s.filing, secondsLeft } };
        }),

      dismissFiling: () => set({ filing: null }),

      removeItem: (id) => {
        const item = get().items.find((i) => i.id === id);
        const list = get().lists.find((l) => l.id === item?.listId);
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        get().showToast(list ? `Removed from ${list.name}` : 'Removed');
      },

      markGotIt: (id) => {
        set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        get().showToast('Nice — marked as got');
      },

      createList: (name, visibility) => {
        const id = nextId();
        const accents = ['#c8f542', '#ff5da2', '#a78bfa'];
        set((s) => ({
          lists: [
            ...s.lists,
            { id, name, visibility, accent: accents[s.lists.length % accents.length] },
          ],
        }));
        get().showToast(`“${name}” is ready`);
        return id;
      },

      toggleReaction: (postId, kind) =>
        set((s) => ({
          feed: s.feed.map((p) =>
            p.id === postId
              ? kind === 'fire'
                ? { ...p, myFire: !p.myFire }
                : { ...p, myHeart: !p.myHeart }
              : p,
          ),
        })),

      setFriendAccess: (friendId, listId, value) =>
        set((s) => ({
          friends: s.friends.map((f) =>
            f.id === friendId ? { ...f, access: { ...f.access, [listId]: value } } : f,
          ),
        })),

      removeFriend: (friendId) => {
        const friend = get().friends.find((f) => f.id === friendId);
        set((s) => ({ friends: s.friends.filter((f) => f.id !== friendId) }));
        if (friend) get().showToast(`${friend.name} removed — they won’t be told`);
      },

      blockFriend: (friendId) => {
        const friend = get().friends.find((f) => f.id === friendId);
        set((s) => ({ friends: s.friends.filter((f) => f.id !== friendId) }));
        if (friend) get().showToast(`${friend.name} blocked`);
      },

      cancelInvite: (inviteId) => {
        set((s) => ({ sentInvites: s.sentInvites.filter((i) => i.id !== inviteId) }));
        get().showToast('Invite cancelled');
      },

      sendRequest: (personId) => {
        const person = get().directory.find((p) => p.id === personId);
        if (!person || person.requested) return;
        set((s) => ({
          directory: s.directory.map((p) => (p.id === personId ? { ...p, requested: true } : p)),
        }));
        get().showToast(`Request sent — ${person.name.split(' ')[0]} has to accept`);
      },

      setSearchQuery: (searchQuery) => set({ searchQuery }),

      answerRequest: (status) => {
        set((s) => ({ request: { ...s.request, status } }));
        if (status === 'accepted') get().showToast('Riley’s in your flock');
      },

      setRequestAccess: (listId, value) =>
        set((s) => ({ request: { ...s.request, access: { ...s.request.access, [listId]: value } } })),

      toggleFriendDibs: (itemId) => {
        const wasDibsed = !!get().friendDibs[itemId];
        set((s) => ({ friendDibs: { ...s.friendDibs, [itemId]: !wasDibsed } }));
        if (!wasDibsed) get().showToast(`Dibs called — ${avaList.owner} will never know`);
      },

      toggleGifterDibs: (itemId) =>
        set((s) => ({ gifterDibs: { ...s.gifterDibs, [itemId]: !s.gifterDibs[itemId] } })),

      setNote: (listId, note) => set((s) => ({ notes: { ...s.notes, [listId]: note } })),

      markLinkCopied: () => {
        set({ linkCopied: true });
        get().showToast('Link copied — send it to anyone');
      },

      showToast: (toast) => set({ toast }),
      clearToast: () => set({ toast: null }),
      openSheet: (sheet) => set({ sheet }),
      closeSheet: () => set({ sheet: null }),
    }),
    {
      name: PERSIST_KEY,
      version: PERSIST_VERSION,
      storage: persistStorage,

      /**
       * Only what the user made. Which tab they were on, the toast that was
       * showing, the sheet that was open and what they had typed into a search
       * box are all facts about a moment, not about them — restoring those
       * would mean reopening a sheet they closed by quitting the app.
       */
      partialize: (s) => ({
        themePreference: s.themePreference,
        reduceMotion: s.reduceMotion,
        firstRun: s.firstRun,
        lists: s.lists,
        items: stripInlinePhotos(s.items),
        friends: s.friends,
        sentInvites: s.sentInvites,
        directory: s.directory,
        feed: s.feed,
        lastListId: s.lastListId,
        request: s.request,
        friendDibs: s.friendDibs,
        gifterDibs: s.gifterDibs,
        notes: s.notes,
      }),

      onRehydrateStorage: () => (state) => {
        // Start handing out ids above everything that came back, or the next
        // capture takes an id an existing shiny is already using.
        if (state) idCounter = Math.max(idCounter, highestId(state.items, state.lists) + 1);
        markHydrated();
      },
    },
  ),
);

// ── Selectors ──────────────────────────────────────────────────────────────

/** "1 shiny" / "3 shinies" — the prototype said "1 shinies" everywhere. */
export const shinies = (count: number) => `${count} ${count === 1 ? 'shiny' : 'shinies'}`;

export const visibilityLabel = (v: Visibility) =>
  v === 'friends' ? 'friends can see it' : v === 'invite' ? 'invite-only' : 'just you';

/** Shinies count shown on Me — seeded above the real items, as in the design. */
export const shinyCountOffset = 8;

/**
 * Note for anyone adding selectors here: a selector must return a stable
 * reference. `find` is fine (it hands back an object that already exists);
 * `filter`/`map` are not — they allocate a fresh array on every read, which
 * makes the store look changed on every render and loops. Select the raw array
 * and derive with `useMemo` in the component instead.
 */
export const meProfile = me;
