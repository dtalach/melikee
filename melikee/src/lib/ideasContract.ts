/**
 * Wire contract for POST /api/ideas (gift inspiration). Types only.
 *
 * The app sends taste signals it already has on the device (no name, phone
 * number or handle). The server turns them into taste themes and specific
 * product ideas. See server/ideas.ts for how.
 */

export type Budget = 'any' | 'under25' | 'under50' | 'under100' | 'splurge';

export type TasteSignals = {
  /** Never the birth date: a band is enough to keep ideas age-appropriate. */
  ageBand?: '13-15' | '16-17' | '18-24' | '25+';
  /** From the device's language and time zone, e.g. "en-US · America/Chicago". */
  region?: string;
  /** The current month, for seasonality. */
  month: string;
  /** Upcoming occasions and how far off they are. */
  occasions: { name: string; days: number }[];
  sizes?: string[];
  budget: Budget;
  /** What's on their lists, newest first. `star` = really want. */
  wants: { name: string; store?: string; price?: string; list?: string; star?: boolean }[];
  /** What they recently typed or said on the capture screen. */
  searches: string[];
  /** Ideas they saved ("Want it") and turned down ("Not for me"). */
  liked: string[];
  disliked: string[];
  /** Ideas already shown, so a new batch doesn't repeat them. */
  seen: string[];
};

export type Theme = { name: string; why: string };

export type Idea = {
  /** Stable id from the name. */
  id: string;
  /** Brand + product + key variant, as a store lists it. */
  name: string;
  /** What to search to find it for sale. */
  query: string;
  /** At most ~9 words, pointing at their signal. */
  why: string;
  theme: string;
  /** Typical price, e.g. "$35". */
  price: string;
};

/** `secret`: a signed-in device gets a bigger daily allowance. */
export type IdeasRequest = { secret?: string; signals: TasteSignals; count: number };

export type IdeasResponse = { ok: true; themes: Theme[]; ideas: Idea[] } | { ok: false; code: 'signed_out' | 'rate_limited' | 'bad_request' | 'not_configured' | 'upstream'; message: string };
