import type { StorePrice } from '@/services/recognition/contract';

/** Who can see a list. Every list carries a default visibility (turn 7). */
export type Visibility = 'friends' | 'invite' | 'me';

export type WishList = {
  id: string;
  name: string;
  visibility: Visibility;
  /** Border accent used on the list row and its shelf cards. */
  accent: string;
  /** Occasion countdown badge, e.g. "71 days". Absent on everyday lists. */
  countdown?: string;
  /** A list created for an occasion that has no date set yet. */
  needsDate?: boolean;
  /** Starter lists cannot be deleted — every account has My wants. */
  starter?: boolean;
};

export type Shiny = {
  id: string;
  listId: string;
  name: string;
  /** Display price, e.g. "$399". "—" while a saved photo is still matching. */
  price: string;
  store: string;
  upc: string;
  /** Provenance line — "by camera · Sat", "from the Feed", "photo saved". */
  provenance: string;
  /** Secret shinies are invisible to everyone, on any list (turn 7). */
  secret: boolean;
  /** Local URI of the photo captured for this shiny, when there was one. */
  photoUri?: string;
  /** True while a fallback-saved photo is still waiting on a match. */
  pending?: boolean;
  /** Where to buy it, when the lookup found a link. */
  buyUrl?: string;
  /** When that price was last checked, ISO. Saved items outlive their prices. */
  checkedAt?: string;
  /** Other retailers the lookup found, with their own prices. */
  otherStores?: StorePrice[];
};

export type Friend = {
  id: string;
  name: string;
  initial: string;
  /** Birthday shown as reference data on the row, e.g. "Aug 17". */
  birthday: string;
  /** Days until that birthday; drives the "— in 12 days" suffix. */
  daysAway?: number;
  /** Which of your lists this friend can see, by list id. */
  access: Record<string, boolean>;
};

export type SentInvite = {
  id: string;
  name: string;
  initial: string;
  when: string;
};

/** A searchable MeLikee user — the "find existing users" half of the sheet. */
export type DirectoryPerson = {
  id: string;
  name: string;
  handle: string;
  initial: string;
  /** School or "from your contacts" — the context cue in search results. */
  context: string;
  mutual: number;
  followsYou: boolean;
  requested: boolean;
  /** Only surfaced when searched for, not in "People you may know". */
  searchOnly?: boolean;
};

export type FeedPost = {
  id: string;
  who: string;
  initial: string;
  listName: string;
  productName: string;
  productPrice: string;
  when: string;
  fires: number;
  hearts: number;
  myFire: boolean;
  myHeart: boolean;
  /** True once you've copied this find into your own list. */
  wanted: boolean;
};

export type TrendingItem = {
  rank: string;
  name: string;
  price: string;
  /** Which brand colour dresses this card — cycles pink / lilac / lime. */
  tone: 'pink' | 'violet' | 'lime';
};

/** An item on someone else's list, from the gifter's side. */
export type FriendListItem = {
  id: string;
  name: string;
  price: string;
  store?: string;
};

export type RequestStatus = 'pending' | 'accepted' | 'declined';

/**
 * The signed-in user. Made during onboarding rather than shipped in the seed,
 * so a new account is their own account and not Maya's.
 */
export type Profile = {
  /** First name only — it's what the app calls you, not a legal record. */
  name: string;
  initial: string;
  /** "@mayalikes". */
  handle: string;
  /** The path on the public page — "maya" in melikee.app/maya. */
  slug: string;
  /** Month index 0–11 and day of month. Absent until they say. */
  birthdayMonth?: number;
  birthdayDay?: number;
  /** Taste tags inferred from your shinies. Fixture content, for now. */
  tasteTags?: string[];
  reactionsReceived: number;
  dibsCalled: number;
  mostLovedShiny?: { name: string; fires: number };
};

/**
 * A product match returned by the recognition service. It is defined in the
 * recognition contract rather than here, because the serverless function
 * produces it and cannot import anything from the app's aliased tree.
 */
export type { ProductMatch, StorePrice } from '@/services/recognition/contract';

/** How a capture was started; changes the copy throughout the flow. */
export type CaptureMode = 'scan' | 'snap' | 'say';

/** The bottom sheets that can be open over any screen. */
export type SheetKind =
  | { kind: 'share'; listId: string }
  | { kind: 'invite' }
  | { kind: 'newList' }
  | { kind: 'settings' }
  | { kind: 'birthday' };
