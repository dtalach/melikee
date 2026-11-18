/**
 * Wire contract for POST /api/friends. Types only, shared by the app and the
 * server. Every request carries the device secret; the server turns it into
 * the signed-in account.
 */
import type { DibsView, PublicItem } from './pagesContract';

/** Someone as other people see them: never their phone number or birth year. */
export type Person = {
  uid: string;
  handle: string;
  name: string;
  /** "Mar 4", when they've given a birthday. */
  birthday?: string;
};

export type Relation = 'none' | 'friends' | 'outgoing' | 'incoming';

export type SearchResult = Person & { state: Relation };

export type FriendListView = {
  id: string;
  name: string;
  isBirthday?: boolean;
  date?: string;
  items: PublicItem[];
  /** Who has called dibs, as this viewer may see it. Never shown to the owner. */
  dibs: DibsView;
};

export type FriendView = Person & {
  since: number;
  /** The lists this friend may see of mine: listId → false when switched off. Missing = on. */
  access: Record<string, boolean>;
  /** The lists they share with me. */
  lists: FriendListView[];
};

export type Pending = Person & { at: number };

export type SyncResponse = {
  ok: true;
  /** `birth`: the account's own birthday (month 1–12), only ever sent to the account itself. */
  me: { uid: string; handle: string; findByPhone: boolean; birth?: { year: number; month: number; day: number } };
  friends: FriendView[];
  incoming: Pending[];
  outgoing: Pending[];
};

export type FriendsRequest =
  | { action: 'sync'; secret: string }
  | { action: 'search'; secret: string; q: string }
  | { action: 'request' | 'accept' | 'decline' | 'cancel' | 'remove' | 'block'; secret: string; uid: string }
  | { action: 'access'; secret: string; uid: string; list: string; on: boolean }
  | { action: 'settings'; secret: string; findByPhone?: boolean; birthday?: { month: number; day: number; year?: number } }
  | { action: 'dibs'; secret: string; uid: string; list: string; itemId: number; claim: boolean };

export type FriendsError = {
  ok: false;
  code: 'signed_out' | 'not_found' | 'not_friends' | 'blocked' | 'taken' | 'rate_limited' | 'bad_request' | 'not_configured' | 'upstream';
  message: string;
};

export type ActionResponse = { ok: true; state?: Relation; dibs?: DibsView } | FriendsError;
export type SearchResponse = { ok: true; results: SearchResult[] } | FriendsError;
