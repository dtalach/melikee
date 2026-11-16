/**
 * Product matching, app side. Every capture path (snap, scan, say, screenshot,
 * pasted link, typed search, trending) goes through `matchFor`, which calls
 * the server at /api/match. See `server/match.ts` for how matching works.
 *
 * On the web the API is same-origin. Native builds (and `expo start --web`,
 * which has no /api) call the deployed app, overridable with
 * EXPO_PUBLIC_API_URL.
 */
import { Platform } from 'react-native';

import type { MatchSource } from '@/store/types';
import type { Candidate, ErrorResponse, FindRequest, FindResponse, ImagePayload, ReadResponse, Reading, StoreOffer } from './matchContract';

export type Match = {
  name: string;
  price: string;
  store: string;
  source: MatchSource;
  /** Alternates list: "best match, 92%", "last year's model". */
  tag?: string;
  confidence?: number;
  url?: string;
  image?: string;
  upc?: string;
  others?: StoreOffer[];
};

/** The production deployment, used when there's no same-origin API. */
const DEFAULT_API = 'https://melikee-eight.vercel.app';

export function apiBase() {
  const env = process.env.EXPO_PUBLIC_API_URL;
  if (env) return env.replace(/\/$/, '');
  if (Platform.OS === 'web' && typeof window !== 'undefined' && !/^(localhost|127\.|192\.168\.)/.test(window.location.hostname)) return '';
  return DEFAULT_API;
}

export class MatchFailure extends Error {
  constructor(
    readonly code: ErrorResponse['code'] | 'network',
    message: string,
  ) {
    super(message);
  }
}

async function post<T>(body: unknown, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${apiBase()}/api/match`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  } catch (e) {
    if ((e as Error)?.name === 'AbortError') throw e;
    throw new MatchFailure('network', 'Couldn’t reach MeLikee. Check your connection.');
  }
  const json = (await res.json().catch(() => null)) as (T & { ok: true }) | ErrorResponse | null;
  if (!json) throw new MatchFailure('upstream', `Matching answered ${res.status}.`);
  if (!json.ok) throw new MatchFailure((json as ErrorResponse).code, (json as ErrorResponse).message);
  return json as T;
}

export async function readPhoto(image: ImagePayload, signal?: AbortSignal): Promise<Reading> {
  return (await post<ReadResponse>({ mode: 'read', image }, signal)).reading;
}

export async function find(req: Omit<FindRequest, 'mode'>, signal?: AbortSignal): Promise<Match[]> {
  const out = await post<FindResponse>({ mode: 'find', ...req }, signal);
  if (!out.found) return [];
  const source: MatchSource = req.source === 'alternates' ? 'catalog' : req.source === 'catalog' ? 'catalog' : req.source;
  return out.candidates.map((c: Candidate) => ({
    name: c.name,
    price: c.price,
    store: c.store,
    source,
    tag: c.tag,
    confidence: c.confidence / 100,
    url: c.url,
    image: c.image,
    upc: c.upc,
    others: c.others,
  }));
}

/** Why a capture found nothing, in the miss sheet's words. */
export type Miss = { kind: 'nomatch' | 'badlink' | 'error'; title: string; body: string };

export const MISS = {
  photo: (problem: Reading['problem']): Miss => ({
    kind: 'nomatch',
    title: 'Can’t tell what this is',
    body:
      problem === 'too dark'
        ? 'Too dark to read. Try more light, type it, or save the photo and we’ll keep looking.'
        : problem === 'too blurry'
          ? 'Too blurry to read. Try holding still, type it, or save the photo and we’ll keep looking.'
          : problem === 'several things'
            ? 'A few things in frame. Try closer on one, type it, or save the photo and we’ll keep looking.'
            : 'Try closer, type it, or save the photo and we’ll keep looking.',
  }),
  nothing: (what: string): Miss => ({ kind: 'nomatch', title: 'Couldn’t find that one', body: `Nothing buyable turned up for ${what}. Try different words, or save it and pick later.` }),
  badlink: (): Miss => ({ kind: 'badlink', title: 'No product on that page', body: 'That link goes to a page, not a product. Save it and pick the product later, or type what you want.' }),
  error: (e: unknown): Miss => ({
    kind: 'error',
    title: 'Matching didn’t work',
    body: e instanceof MatchFailure && e.code === 'not_configured' ? 'Product matching isn’t set up on this server yet.' : e instanceof MatchFailure ? e.message : 'Something went wrong. Try again, or type it.',
  }),
};

export function priceValue(p: string) {
  return parseFloat(String(p).replace(/[^0-9.]/g, '')) || 0;
}

export function hostOf(url: string) {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split(/[/?#]/)[0];
}

/** Badge text on the found sheet, per the spec's match-state table. */
export function matchBadge(m: Match, chosenIndex: number) {
  switch (m.source) {
    case 'barcode':
      return 'Exact · barcode';
    case 'link':
      return 'From your link';
    case 'catalog':
      return 'From trending';
    case 'search':
      return 'Search result';
    default:
      return `Looks like · ${chosenIndex === 0 && m.confidence != null ? `${Math.round(m.confidence * 100)}%` : 'close match'}`;
  }
}

export function isExact(m: Match) {
  return m.source === 'barcode' || m.source === 'link' || m.source === 'catalog' || m.source === 'search';
}
