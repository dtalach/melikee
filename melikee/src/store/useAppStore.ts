import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  avaList,
  seedDirectory,
  seedFeed,
  seedFriends,
  seedItems,
  seedLists,
  seedSentInvites,
} from '@/data/seed';
import { demoProfile, makeProfile } from '@/store/profile';
import type {
  DirectoryPerson,
  FeedPost,
  Friend,
  ProductMatch,
  Profile,
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

  // ── Identity ─────────────────────────────────────────────────────────────
  /** False until someone has told the app who they are. */
  onboarded: boolean;
  profile: Profile;
  /** True while the app is furnished with the seed fixtures rather than real use. */
  demoContent: boolean;

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

  /** Riley's inbound follow request, and which lists they'd get. Null on a
   * real account, which has nobody knocking yet. */
  request: { status: RequestStatus; access: Record<string, boolean> } | null;

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
  /** Finish onboarding: become this person, on an empty account. */
  completeOnboarding: (input: { name: string; birthday?: { month: number; day: number } }) => void;
  /** Skip onboarding and look around Maya's account instead. */
  useDemoAccount: () => void;
  /** Set or clear the birthday the countdown runs on. */
  setBirthday: (birthday?: { month: number; day: number }) => void;
  /** Back to the welcome screen with nothing kept. */
  startOver: () => void;

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

/**
 * What a brand-new account gets: somewhere for everything, and somewhere
 * nobody else can see. Both are `starter`, so neither can be deleted.
 */
const starterLists = (): WishList[] => [
  { id: 'w', name: 'My wants', visibility: 'friends', accent: '#c8f542', starter: true },
  { id: 'sec', name: 'Secret stash', visibility: 'me', accent: '#a78bfa', starter: true },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      activeTab: 'camera',
      setActiveTab: (activeTab) => set({ activeTab }),

      // The app starts furnished, because the alternative is that the very
      // first screenshot of it is empty. Onboarding sits on top of that and
      // clears it the moment someone says who they are; the welcome screen
      // also offers to leave it alone and just look around.
      onboarded: false,
      profile: demoProfile,
      demoContent: true,

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

      completeOnboarding: ({ name, birthday }) =>
        set({
          onboarded: true,
          demoContent: false,
          profile: makeProfile(name, birthday),
          // The camera's onboarding sticker keeps showing until the first
          // capture — arriving is not the same as having done it once.
          firstRun: true,
          // Two starter lists and nothing in them. The occasion list is not
          // created for you: it belongs to an occasion you have not named.
          lists: starterLists(),
          items: [],
          friends: [],
          sentInvites: [],
          feed: [],
          request: null,
          lastListId: 'w',
          friendDibs: {},
          gifterDibs: {},
          notes: {},
          filing: null,
        }),

      useDemoAccount: () => set({ onboarded: true }),

      setBirthday: (birthday) =>
        set((s) => ({
          profile: { ...s.profile, birthdayMonth: birthday?.month, birthdayDay: birthday?.day },
        })),

      startOver: () =>
        set({
          onboarded: false,
          demoContent: true,
          profile: demoProfile,
          firstRun: true,
          lists: seedLists,
          items: seedItems,
          friends: seedFriends,
          sentInvites: seedSentInvites,
          directory: seedDirectory,
          feed: seedFeed,
          request: { status: 'pending', access: { w: true, s16: false } },
          lastListId: 'w',
          friendDibs: {},
          gifterDibs: {},
          notes: {},
          filing: null,
          sheet: null,
          activeTab: 'camera',
        }),

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
        set((s) => (s.request ? { request: { ...s.request, status } } : s));
        if (status === 'accepted') get().showToast('Riley’s in your flock');
      },

      setRequestAccess: (listId, value) =>
        set((s) =>
          s.request
            ? { request: { ...s.request, access: { ...s.request.access, [listId]: value } } }
            : s,
        ),

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
        onboarded: s.onboarded,
        profile: s.profile,
        demoContent: s.demoContent,
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

/**
 * What the bell on the camera is counting. It used to be the literal number 3,
 * which a brand-new account with no friends and an empty Feed wore as a lie.
 *
 * The Feed's two digest cards — a price drop and a reaction — are still fixture
 * content, and they only render once you have people, so the badge only counts
 * them then. The follow request is real state and counts when it's waiting.
 */
export const attentionCount = (s: AppState): number =>
  (s.friends.length > 0 ? 2 : 0) + (s.request?.status === 'pending' ? 1 : 0);

/** "1 shiny" / "3 shinies" — the prototype said "1 shinies" everywhere. */
export const shinies = (count: number) => `${count} ${count === 1 ? 'shiny' : 'shinies'}`;

export const visibilityLabel = (v: Visibility) =>
  v === 'friends' ? 'friends can see it' : v === 'invite' ? 'invite-only' : 'just you';

/**
 * The Me screen's shiny count was seeded eight above the real one, to make the
 * design's profile look lived-in. That is a flattering lie to tell a real
 * account, so it now only applies to the demo.
 */
export const shinyCountOffset = (demoContent: boolean) => (demoContent ? 8 : 0);

/**
 * Note for anyone adding selectors here: a selector must return a stable
 * reference. `find` is fine (it hands back an object that already exists);
 * `filter`/`map` are not — they allocate a fresh array on every read, which
 * makes the store look changed on every render and loops. Select the raw array
 * and derive with `useMemo` in the component instead.
 */

