import type { Month, MonthDay } from '@/lib/dates';
import type { StoreOffer } from '@/lib/matchContract';
import type { Sizes } from '@/lib/sizes';

/** Private · Friends · Friends + link — the one sharing scale from the spec. */
export type Vis = 'me' | 'friends' | 'invite';

export type LinkExpiry = 'date' | '30d' | 'always';

export type WishList = {
  id: string;
  name: string;
  vis: Vis;
  accent: string;
  /** Optional occasion date. The birthday list follows the profile's birthday. */
  date?: MonthDay;
  isBirthday?: boolean;
  archived?: boolean;
  /** Note shown at the top of the gifter page. */
  note?: string;
  /** Changes on "Reset link"; old links stop working. */
  linkToken: string;
  linkExpiry: LinkExpiry;
  /** When the current link was issued: "30 days" and "till the date" count from here. */
  linkSince?: number;
};

export type MatchSource = 'barcode' | 'link' | 'catalog' | 'search' | 'photo' | 'voice' | 'screenshot';

export type Item = {
  id: number;
  list: string;
  name: string;
  /** Display price, e.g. "$79". "—" while pending. */
  price: string;
  store: string;
  upc: string;
  /** "by camera · Sat", "from Feed · Jul 18" — how and when it arrived. */
  added: string;
  createdAt: number;
  star?: boolean;
  size?: string;
  note?: string;
  /** Price drop vs. 30-day high, e.g. "$3". */
  drop?: string;
  /** Price alerts default on (spec). */
  alert?: boolean;
  /** Saved photo/link/video still being matched. Gifters can't dib it. */
  pending?: boolean;
  suggest?: { name: string; price: string; store: string; url?: string; image?: string; upc?: string; others?: StoreOffer[] } | null;
  /** What to search for when matching a saved shiny later. */
  query?: string;
  /** The store's product page. */
  url?: string;
  /** The store's product photo (https). */
  image?: string;
  /** The user's own shot (a small JPEG data URI), shown when there's no store photo. Never published. */
  photo?: string;
  /** A product-photo lookup already ran for this shiny, so it isn't repeated. */
  imageTried?: boolean;
  /** Other stores carrying it, as seen when it was matched. */
  others?: StoreOffer[];
  /** When the price was last looked up. Absent on sample data. */
  checkedAt?: number;
};

export type Friend = {
  id: string;
  name: string;
  initial: string;
  birthday: MonthDay;
  /** Per-list access the user grants this friend. */
  access: Record<string, boolean>;
};

/** One shiny on a friend's list, seen from the gifter's side. */
export type FriendItem = {
  id: string;
  name: string;
  price: string;
  store: string;
  star?: boolean;
  drop?: string;
  /** Someone else already called dibs. */
  taken?: boolean;
  /** Chip-in items take pooled, anonymous contributions. */
  chipIn?: boolean;
};

export type FriendList = {
  id: string;
  friendId: string;
  name: string;
  items: FriendItem[];
};

export type FeedEntry = {
  id: string;
  friendId: string;
  list: string;
  name: string;
  price: string;
  store: string;
  at: number;
  hearts: number;
  myHeart: boolean;
  wanted: boolean;
};

export type Contact = {
  id: string;
  name: string;
  handle: string;
  initial: string;
  /** Shown as context only when it comes from the user's own contacts. */
  context: string;
  mutual: number;
  follows: boolean;
  requested: boolean;
  /** Only appears when searched for, never suggested. */
  searchOnly?: boolean;
};

export type SentInvite = { id: string; name: string; initial: string; at: number };

export type LinkHolder = { id: string; initial: string; name: string; listId: string; action: string; at: number };

export type FriendRequest = {
  id: string;
  name: string;
  initial: string;
  mutual: number;
  birthday: MonthDay;
  state: 'pending' | 'choosing';
  access: Record<string, boolean>;
};

export type NotifKind = 'drop' | 'bday' | 'too' | 'coming' | 'req' | 'match' | 'love';

export type Notif = {
  id: string;
  kind: NotifKind;
  title: string;
  sub: string;
  at: number;
  read: boolean;
  /** Where tapping it goes. */
  to: Route;
};

export type NotifSettings = Record<'drop' | 'bday' | 'too' | 'coming' | 'req', boolean>;

export type Profile = {
  name: string;
  handle: string;
  birthday: MonthDay & { year: number };
  remindGifters: boolean;
  showCountdown: boolean;
  parent: { on: boolean; approve: boolean; name: string; contact: string; since: number } | null;
  email: string;
  /** Shown to gifters on your shared links. */
  sizes?: Sizes;
};

export type Route =
  | { name: 'camera' }
  | { name: 'feed' }
  | { name: 'lists' }
  | { name: 'list'; id: string }
  | { name: 'item'; id: number }
  | { name: 'people' }
  | { name: 'friendList'; id: string }
  | { name: 'me' }
  | { name: 'settings' }
  | { name: 'notifs' }
  | { name: 'gifter'; listId: string }
  | { name: 'onboarding' };

export type Sheet =
  | { type: 'share'; listId: string }
  | { type: 'invite' }
  | { type: 'bday' }
  | { type: 'parent' }
  | { type: 'cleanup'; listId: string }
  | { type: 'feedItem'; id: string }
  | { type: 'confirm'; action: 'remove' | 'block'; friendId: string }
  | { type: 'newList' }
  | { type: 'listSettings'; listId: string }
  | { type: 'vis'; listId: string }
  | { type: 'notifSettings' }
  | { type: 'privacy' }
  | { type: 'handle' }
  | { type: 'sizes' };

export type { Month, MonthDay };
