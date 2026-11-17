/**
 * Wire contract for shared lists: /api/pages and /api/dibs. Types only, shared
 * by the app and the server.
 *
 * Only Friends + link lists are ever published (spec: private lists never
 * appear on gifter pages). Friends-only lists need friend accounts, which
 * don't exist yet, so they stay on the device too.
 */

export type PublicItem = {
  id: number;
  name: string;
  price: string;
  store: string;
  url?: string;
  image?: string;
  size?: string;
  note?: string;
  star?: boolean;
  /** Still being matched: gifters see "Still choosing" and can't call dibs. */
  pending?: boolean;
};

export type PublicList = {
  id: string;
  slug: string;
  name: string;
  note?: string;
  token: string;
  /** Epoch ms after which the link stops working; null = always. */
  expiresAt: number | null;
  items: PublicItem[];
};

export type PublishRequest = {
  handle: string;
  /** Proves this device owns the handle. Generated on the device, never shown. */
  secret: string;
  /** When the handle changed, the old page is removed. */
  previousHandle?: string;
  profile: { name: string; birthday: string };
  lists: PublicList[];
};

export type PublishResponse = { ok: true } | { ok: false; code: 'taken' | 'signed_out' | 'bad_request' | 'not_configured' | 'upstream'; message: string };

/** One claim as other gifters see it: who has it, and whether it's yours. */
export type DibsView = Record<string, { name: string; mine: boolean }>;

export type PageResponse =
  | {
      ok: true;
      owner: { name: string; birthday: string };
      list: { id: string; name: string; note?: string; isMain: boolean; items: PublicItem[] };
      dibs: DibsView;
    }
  | { ok: false; code: 'expired' | 'not_configured' | 'upstream'; message: string };

export type DibsRequest = {
  handle: string;
  list: string;
  /** The link's token; not needed when the list was reached from the profile link. */
  t?: string;
  itemId: number;
  /** Random id kept by the gifter's browser, so they can undo their own dibs. */
  gifter: string;
  name: string;
  action: 'claim' | 'release';
};

export type DibsResponse = { ok: true; dibs: DibsView } | { ok: false; code: 'taken' | 'expired' | 'bad_request' | 'not_configured' | 'upstream'; message: string; dibs?: DibsView };
