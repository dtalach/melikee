/**
 * Product matching — stubbed.
 *
 * There's no product API yet. Every capture path (snap, scan, say, screenshot,
 * pasted link, typed search, trending) goes through here and gets a scripted
 * result, so wiring in a real lookup is a change to this file only.
 */
import type { MatchSource } from '@/store/types';

export type Match = {
  name: string;
  price: string;
  store: string;
  source: MatchSource;
  /** Shown on the alternates list. */
  tag?: string;
  confidence?: number;
};

/** Below this, show "Can't tell what this is" instead of a guess. */
export const CONFIDENCE_FLOOR = 0.6;

const photoMatches: Match[] = [
  { name: 'Sony XM6 headphones', price: '$399', store: 'Best Buy', source: 'photo', tag: 'best match, 96%', confidence: 0.96 },
  { name: 'Sony XM5 headphones', price: '$329', store: 'Best Buy', source: 'photo', tag: 'last year’s model', confidence: 0.81 },
  { name: 'Sony XM6 — silver', price: '$399', store: 'Amazon', source: 'photo', tag: 'different color', confidence: 0.78 },
];

export const SAY_SAMPLE = '“those Sony noise-cancelling headphones”';

export function matchCapture(source: MatchSource): { best: Match; alternates: Match[] } {
  if (source === 'barcode') {
    return { best: { ...photoMatches[0], source, tag: 'exact', confidence: 1 }, alternates: photoMatches };
  }
  return { best: { ...photoMatches[0], source }, alternates: photoMatches.map((m) => ({ ...m, source })) };
}

export function matchBarcode(data: string): Match {
  return { ...photoMatches[0], source: 'barcode', tag: `UPC ${data}`, confidence: 1 };
}

/** A pasted product link. Returns null when the page has no product on it. */
export function matchLink(url: string): Match | null {
  if (!/^https?:\/\/[^/]+\/.+/i.test(url)) return null;
  const host = hostOf(url);
  const storeName = storeFromHost(host);
  return { name: 'Stanley Quencher 40oz', price: '$45', store: storeName, source: 'link', confidence: 1 };
}

export function matchTyped(q: string): Match {
  const name = q.trim().charAt(0).toUpperCase() + q.trim().slice(1);
  return { name, price: '$34', store: 'Amazon', source: 'search', confidence: 1 };
}

export function matchTrending(t: { name: string; price: string }): Match {
  return { name: t.name, price: t.price, store: 'Amazon', source: 'catalog', confidence: 1 };
}

/** Near matches offered for "Wrong product?" on an item already saved. */
export function alternatesFor(item: { name: string; price: string; store: string; pending?: boolean }): Match[] {
  if (item.pending) {
    return [
      { name: 'Stanley Quencher 40oz', price: '$45', store: 'Amazon', source: 'photo', tag: 'best guess from your photo' },
      { name: 'Owala FreeSip 24oz', price: '$28', store: 'Target', source: 'photo', tag: 'similar shape' },
      { name: 'Hydro Flask 32oz', price: '$45', store: 'REI', source: 'photo', tag: 'similar color' },
    ];
  }
  const n = priceValue(item.price) || 40;
  return [
    { name: `${item.name} — other color`, price: item.price, store: item.store, source: 'catalog', tag: 'same product, different color' },
    { name: `${item.name} (previous model)`, price: `$${Math.max(5, Math.round(n * 0.82))}`, store: item.store, source: 'catalog', tag: 'last year’s version' },
    { name: `Something similar to ${item.name}`, price: item.price, store: 'Amazon', source: 'catalog', tag: 'close match' },
  ];
}

/** The suggestion a pending photo resolves to after a while. */
export const PENDING_SUGGESTION = { name: 'Stanley Quencher 40oz', price: '$45', store: 'Amazon' };

/** Other stores for the found sheet and item detail, cheapest first. */
export function otherStores(price: string, best: string, pool = ['Amazon', 'Target', 'Walmart', 'Best Buy']) {
  const base = priceValue(price);
  return pool
    .filter((s) => s !== best)
    .slice(0, 2)
    .map((store, i) => ({ store, price: base ? `$${Math.round(base * (1.04 + i * 0.05))}` : '—' }));
}

export function priceValue(p: string) {
  return parseFloat(String(p).replace(/[^0-9.]/g, '')) || 0;
}

export function hostOf(url: string) {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0];
}

function storeFromHost(host: string) {
  const known: Record<string, string> = {
    'amazon.com': 'Amazon',
    'target.com': 'Target',
    'walmart.com': 'Walmart',
    'bestbuy.com': 'Best Buy',
    'urbanoutfitters.com': 'Urban Outfitters',
    'sephora.com': 'Sephora',
    'rei.com': 'REI',
  };
  return known[host] ?? host;
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
      return `Looks like · ${chosenIndex === 0 ? `${Math.round((m.confidence ?? 0.96) * 100)}%` : 'close match'}`;
  }
}

export function isExact(m: Match) {
  return m.source === 'barcode' || m.source === 'link' || m.source === 'catalog' || m.source === 'search';
}
