/**
 * Product recognition.
 *
 * The capture hardware is real — camera, barcode scanner and dictation all run
 * for real — but there is no product API behind them yet, so recognition is
 * stubbed here. Everything the rest of the app knows about matching goes
 * through this module, so swapping in a real lookup service is a change to
 * this file alone.
 *
 * The scripted results are the ones the design review signed off on: the Sony
 * XM6 as the best match, with last year's model and a colour variant as the
 * near-match candidates.
 */
import type { CaptureMode, ProductMatch } from '@/store/types';

/** How long the "Working our magic…" phase runs before results land. */
const FAKE_LATENCY = 1600;

const SCRIPTED: ProductMatch[] = [
  {
    name: 'Sony XM6 headphones',
    price: '$399',
    stores: 'Best Buy + 2 stores',
    storeName: 'Best Buy',
    upc: '027242925175',
    reason: 'best match, 96%',
  },
  {
    name: 'Sony XM5 headphones',
    price: '$329',
    stores: 'Best Buy + 2 stores',
    storeName: 'Best Buy',
    upc: '027242923041',
    reason: 'last year’s model',
  },
  {
    name: 'Sony XM6 — silver',
    price: '$399',
    stores: 'Amazon + 1 store',
    storeName: 'Amazon',
    upc: '027242925182',
    reason: 'different colour',
  },
];

/**
 * A handful of real UPCs so a genuine barcode scan of something in the demo
 * data resolves to the right product rather than the scripted headphones.
 */
const UPC_CATALOGUE: Record<string, ProductMatch> = {
  '194671203984': {
    name: 'On Cloudmonster 2',
    price: '$180',
    stores: 'REI + 2 stores',
    storeName: 'REI',
    upc: '194671203984',
    reason: 'exact match from the barcode',
  },
  '074101204209': {
    name: 'Instax Mini 12',
    price: '$79',
    stores: 'Target + 2 stores',
    storeName: 'Target',
    upc: '074101204209',
    reason: 'exact match from the barcode',
  },
  '195949052026': {
    name: 'Airpods 4',
    price: '$129',
    stores: 'Apple + 2 stores',
    storeName: 'Apple',
    upc: '195949052026',
    reason: 'exact match from the barcode',
  },
  '027242925175': { ...SCRIPTED[0], reason: 'exact match from the barcode' },
};

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type MatchRequest =
  | { mode: 'scan'; upc: string }
  | { mode: 'snap'; photoUri?: string }
  | { mode: 'say'; transcript: string };

/**
 * Returns candidates best-first. The first is shown on the found card; the
 * rest populate "not it — see near matches".
 */
export async function matchProduct(request: MatchRequest): Promise<ProductMatch[]> {
  await delay(FAKE_LATENCY);

  if (request.mode === 'scan') {
    const known = UPC_CATALOGUE[request.upc];
    if (known) return [known, ...SCRIPTED.filter((m) => m.upc !== known.upc)];
    // An unrecognised barcode still carries a real UPC — keep it on the top
    // candidate so the item detail shows what was actually scanned.
    return [{ ...SCRIPTED[0], upc: request.upc, reason: 'closest match we found' }, ...SCRIPTED.slice(1)];
  }

  if (request.mode === 'say' && request.transcript.trim()) {
    return [{ ...SCRIPTED[0], reason: 'best match from your words' }, ...SCRIPTED.slice(1)];
  }

  return SCRIPTED;
}

/** Mode-aware copy for the "working our magic" phase. */
export function magicNote(mode: CaptureMode) {
  return mode === 'scan'
    ? 'exact match from the barcode'
    : mode === 'say'
      ? 'matching your words to products'
      : 'matching product · finding stores';
}

/** Mode-aware caption on the found card's image. */
export function foundImageLabel(mode: CaptureMode) {
  return mode === 'scan'
    ? 'catalog photo, from UPC'
    : mode === 'say'
      ? 'best match from your words'
      : 'your photo, matched';
}

/** Mode-aware hint under the camera greeting. */
export function captureHint(mode: CaptureMode) {
  return mode === 'snap'
    ? 'Me likee? Me wantee? Snap it.'
    : mode === 'scan'
      ? 'Find the barcode, line it up.'
      : 'Just say what you want.';
}

/**
 * Prices drift, so the app never presents one as fact — every price carries
 * a freshness whisper (design punch list item 6).
 */
export const PRICE_FRESHNESS = 'price checked 2h ago';
