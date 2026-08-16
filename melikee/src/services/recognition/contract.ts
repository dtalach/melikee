/**
 * The wire contract between the app and the recognition endpoint.
 *
 * This file is imported by *both* sides — the Expo app and the serverless
 * function in `api/` — so it must stay dependency-free and must not use the
 * `@/` path alias, which only the Metro/TypeScript side understands. Plain
 * types, plain relative imports, nothing else.
 */

/** A product match returned by the recognition service. */
export type ProductMatch = {
  name: string;
  price: string;
  /** "Best Buy + 2 stores" — where it can be had. */
  stores: string;
  /** The single store used as the item's home store. */
  storeName: string;
  upc: string;
  /** Why this candidate matched — "best match, 96%", "different colour". */
  reason: string;
  /** A direct link to the product page, when the search found one. */
  buyUrl?: string;
  /**
   * The retailer's own photo of the product. This is how a person tells a
   * near-match from the real thing — a name and a price cannot do it.
   */
  imageUrl?: string;
  /** Other retailers carrying the same thing, with the prices they quoted. */
  otherStores?: StorePrice[];
  /** 0–100. How sure the service is that this is the right product. */
  confidence?: number;
};

/** One retailer's current price for a product. */
export type StorePrice = {
  storeName: string;
  price: string;
  buyUrl?: string;
};

/** What the vision pass read off the photo, before anything was searched. */
export type ProductReading = {
  brand: string;
  productName: string;
  modelNumber: string;
  category: string;
  color: string;
  variant: string;
  /** Every legible string on the product or its packaging. */
  visibleText: string[];
  /** How confident the eye is that it identified a specific product. */
  confidence: 'high' | 'medium' | 'low';
  /** Whether the frame itself got in the way, and how. */
  frameProblem: 'none' | 'too dark' | 'too blurry' | 'nothing in frame';
  /** The query the eye would type into a shop's search box. */
  searchQuery: string;
};

export type RecognizeImage = {
  /** Base64, no data-URI prefix. */
  data: string;
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
};

/**
 * The two Claude passes are separately addressable, because they finish at
 * wildly different times. Reading a photo takes about four seconds; searching
 * the shops takes closer to twenty. Asking for both behind one request means
 * sitting on a good answer for sixteen seconds with nothing on screen.
 *
 * `snap` still runs both, for anything that would rather have one round trip.
 * The app uses `read` then `listings`, and shows the reading in between.
 */
export type RecognizeRequest =
  | { mode: 'scan'; upc: string }
  | { mode: 'say'; transcript: string }
  | { mode: 'snap'; image: RecognizeImage }
  | { mode: 'read'; image: RecognizeImage }
  // The same cheap identity step the photo gets, for the other two ways in.
  // A barcode's digits and a mumbled sentence are both worse names than the
  // product actually has, and both can be turned into the real one long
  // before anyone needs to know what it costs.
  | { mode: 'identify-scan'; upc: string }
  | { mode: 'identify-say'; transcript: string }
  | { mode: 'listings'; reading: ProductReading };

/**
 * Why a lookup came back empty. The app maps each of these to different copy,
 * so they are part of the contract rather than a debugging detail.
 *
 * - `not_configured` — the endpoint has no API key. Development, mostly.
 * - `no_product`     — Claude looked and there was no product in the frame.
 * - `no_photo`       — the device never produced an image to look at.
 * - `bad_photo`      — an image arrived, but it was too dark or blurred to read.
 * - `no_match`       — a real product, but the search turned up no listings.
 * - `refused`        — the model declined to describe the image.
 * - `upstream`       — the API errored or timed out.
 * - `bad_request`    — the app sent something malformed.
 */
export type RecognizeErrorCode =
  | 'not_configured'
  | 'no_product'
  | 'no_photo'
  | 'bad_photo'
  | 'no_match'
  | 'refused'
  | 'upstream'
  | 'bad_request';

/** Where the seconds went. Diagnostic only — no screen renders this. */
export type RecognizeTiming = {
  /** The vision pass. Absent for barcodes and spoken wants, which skip it. */
  readMs?: number;
  /** The web-search pass. */
  searchMs?: number;
  totalMs: number;
};

/** What the eye came back with, before anything has been searched. */
export type ReadResponse =
  | { ok: true; reading: ProductReading; timing?: RecognizeTiming }
  | { ok: false; code: RecognizeErrorCode; message: string; timing?: RecognizeTiming };

export type RecognizeResponse =
  | {
      ok: true;
      candidates: ProductMatch[];
      /** Only present for photo captures. */
      reading?: ProductReading;
      /** How fresh the prices are — the app never presents one as fact. */
      checkedAt: string;
      timing?: RecognizeTiming;
    }
  | { ok: false; code: RecognizeErrorCode; message: string; timing?: RecognizeTiming };

/** The route the app posts to, relative to the API base. */
export const RECOGNIZE_PATH = '/api/recognize';
