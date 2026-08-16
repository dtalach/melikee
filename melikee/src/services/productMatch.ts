/**
 * Product recognition, app side.
 *
 * Everything the app knows about matching still goes through this module — the
 * capture store calls `matchProduct` and nothing else — but the answer now
 * comes from Claude by way of `/api/recognize` rather than from a script.
 *
 * The scripted catalogue below has not been deleted. It is the demo mode: when
 * there is no recognition service to ask (a device build with nothing
 * configured, a deployment missing its API key, a plane), the ritual still
 * works end to end and every match it produces says so on its own face. A
 * demo that silently pretends to be real is the one thing worse than no demo.
 */
import { callRead, callRecognize, hasRecognitionService } from '@/services/recognition/client';
import type {
  ProductReading,
  RecognizeErrorCode,
  RecognizeImage,
} from '@/services/recognition/contract';
import type { CaptureMode, ProductMatch } from '@/store/types';

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
 * data resolves to the right product even in demo mode.
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
  '027242925175': SCRIPTED[0],
};

/** The beat the reveal needs to land, so demo mode doesn't answer instantly. */
const DEMO_LATENCY = 1600;

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export type MatchRequest =
  | { mode: 'scan'; upc: string }
  | { mode: 'snap'; photoUri?: string; image?: RecognizeImage; reading?: ProductReading }
  | { mode: 'say'; transcript: string };

export type ReadOutcome =
  | { ok: true; reading: ProductReading }
  | { ok: false; code: RecognizeErrorCode; message: string };

/**
 * The eye, on its own. Roughly four seconds against roughly twenty for the
 * search, which is the entire reason the two are asked for separately: the
 * product's name can be on screen while the shops are still being checked.
 *
 * Returns null when there is nothing to ask — no service, or no photo — which
 * means the caller should go straight to the demo.
 */
export async function readPhoto(image?: RecognizeImage): Promise<ReadOutcome | null> {
  if (!hasRecognitionService || !image) return null;
  const response = await callRead({ mode: 'read', image });
  if (response.ok) return { ok: true, reading: response.reading };
  if (response.code === 'not_configured') return null;
  return { ok: false, code: response.code, message: response.message };
}

export type MatchOutcome =
  | {
      ok: true;
      /** Best first. The first is shown on the found card; the rest are near matches. */
      candidates: ProductMatch[];
      /** True when these came from the scripted catalogue rather than a real lookup. */
      demo: boolean;
    }
  | { ok: false; code: RecognizeErrorCode; message: string };

export async function matchProduct(request: MatchRequest): Promise<MatchOutcome> {
  // A snap that produced no image is not a lookup we can do, and it must never
  // become one: answering it from the scripted catalogue once put a product on
  // screen that nobody had photographed. The camera screen stops this before
  // it gets here; this is the second lock on the same door.
  if (request.mode === 'snap' && !request.image && hasRecognitionService) {
    return { ok: false, code: 'no_photo', message: 'The device produced no image to look at.' };
  }

  // No service to ask at all — a device build with nothing configured, a
  // deployment missing its key, a plane. The ritual still runs, and the found
  // card says on its own face that the match is a demo.
  if (!hasRecognitionService) return demoMatch(request);

  const response = await callRecognize(
    request.mode === 'scan'
      ? { mode: 'scan', upc: request.upc }
      : request.mode === 'say'
        ? { mode: 'say', transcript: request.transcript }
        : // A reading already in hand means the photo was read moments ago;
          // asking for `listings` skips doing it twice.
          request.reading
          ? { mode: 'listings', reading: request.reading }
          : { mode: 'snap', image: request.image! },
  );

  if (response.ok) return { ok: true, candidates: response.candidates, demo: false };

  // "Nothing is deployed" is a setup problem, not a user's problem — fall back
  // to the demo so the app is still demonstrable. Everything else is a real
  // answer about a real lookup and the user deserves to hear it.
  if (response.code === 'not_configured') return demoMatch(request);

  return { ok: false, code: response.code, message: response.message };
}

async function demoMatch(request: MatchRequest): Promise<MatchOutcome> {
  await delay(DEMO_LATENCY);

  if (request.mode === 'scan') {
    const known = UPC_CATALOGUE[request.upc];
    if (known) {
      return { ok: true, demo: true, candidates: [known, ...SCRIPTED.filter((m) => m.upc !== known.upc)] };
    }
    // An unrecognised barcode still carries a real UPC — keep it on the top
    // candidate so the item detail shows what was actually scanned.
    return {
      ok: true,
      demo: true,
      candidates: [{ ...SCRIPTED[0], upc: request.upc }, ...SCRIPTED.slice(1)],
    };
  }

  return { ok: true, demo: true, candidates: SCRIPTED };
}

/** Mode-aware copy for the "working our magic" phase. */
export function magicNote(mode: CaptureMode) {
  return mode === 'scan'
    ? 'looking that barcode up'
    : mode === 'say'
      ? 'matching your words to products'
      : 'reading your photo · finding stores';
}

/** What the wait says once it has gone on long enough to need explaining. */
export const MAGIC_PATIENCE_MS = 7000;
export const MAGIC_PATIENCE_NOTE = 'still checking shops — worth the wait';

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
 * What went wrong, in the app's voice. Every one of these ends with something
 * the user can do, because the wish is still standing in front of them.
 */
export function missCopy(code: RecognizeErrorCode, mode: CaptureMode): { title: string; note: string } {
  switch (code) {
    case 'no_product':
      return {
        title: 'Nothing shiny in there',
        note: 'Get the thing in frame and have another go — closer helps.',
      };
    case 'no_photo':
      return {
        title: 'The camera came up empty',
        note: 'No picture reached us. Have another go.',
      };
    case 'bad_photo':
      return {
        title: 'Couldn’t make that out',
        note: 'Give the camera a second to focus, then snap again.',
      };
    case 'no_match':
      return {
        title: 'Couldn’t find it in any shop',
        note:
          mode === 'say'
            ? 'Try saying the brand as well as the thing.'
            : 'It might be too new, or not sold online yet.',
      };
    case 'refused':
      return { title: 'Couldn’t read that one', note: 'Try a photo of just the product.' };
    case 'not_configured':
      return { title: 'Matching is switched off', note: 'The lookup service isn’t set up yet.' };
    case 'bad_request':
      return { title: 'That didn’t come through', note: 'Give it another go.' };
    case 'upstream':
    default:
      return { title: 'Couldn’t reach the shops', note: 'Check your signal and try again.' };
  }
}

/**
 * Whether the photo itself is the problem.
 *
 * When it is, re-running the same lookup is guaranteed to fail the same way,
 * and the only useful button goes back to the viewfinder. When it isn't — a
 * timeout, an API error, a search that found nothing — the photo is fine and
 * running it again is exactly the right move.
 */
export function needsAnotherPhoto(code: RecognizeErrorCode): boolean {
  return code === 'no_product' || code === 'no_photo' || code === 'bad_photo' || code === 'refused';
}

/** Faults worth showing the raw reason for, rather than only friendly copy. */
export function showsDetail(code: RecognizeErrorCode): boolean {
  return code === 'upstream' || code === 'no_photo' || code === 'bad_photo';
}

/**
 * Prices drift, so the app never presents one as fact — every price carries
 * a freshness whisper (design punch list item 6). Now that a price comes from a
 * real search at a real moment, and now that saved items outlive the session,
 * the whisper says how long ago that moment was rather than a fixed fib.
 */
export function priceFreshness(checkedAt?: string): string {
  if (!checkedAt) return 'price may have moved';
  const ms = Date.now() - Date.parse(checkedAt);
  if (!Number.isFinite(ms) || ms < 0) return 'price checked just now';

  const minutes = Math.floor(ms / 60_000);
  if (minutes < 2) return 'price checked just now';
  if (minutes < 60) return `price checked ${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `price checked ${hours}h ago`;

  const days = Math.floor(hours / 24);
  return days === 1 ? 'price checked yesterday' : `price checked ${days}d ago`;
}
