/**
 * The wire contract between the app and POST /api/match. Shared by both
 * sides; holds types only, so nothing server-side ends up in the app bundle.
 *
 * Two steps, called separately so neither runs into the function time limit:
 *   read  — a photo in, what the product is called out (a few seconds).
 *   find  — a name, barcode, sentence or link in, real listings out.
 *   image — a product photo for a listing that came back without one.
 */

export type ImagePayload = { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; data: string };

export type ReadRequest = { mode: 'read'; image: ImagePayload };

export type FindRequest = {
  mode: 'find';
  /** What to look for: a product name, a spoken sentence, or a typed query. */
  query?: string;
  /** Extra detail from the photo reading: brand, model number, colour. */
  hint?: string;
  upc?: string;
  url?: string;
  /** How the want was captured, which changes how the query is read. */
  source: 'photo' | 'screenshot' | 'barcode' | 'voice' | 'search' | 'link' | 'catalog' | 'alternates';
  /** Spend more searches. Used for saved photos matched in the background. */
  thorough?: boolean;
};

/** A product photo for a listing that came back without one. */
export type ImageRequest = {
  mode: 'image';
  name: string;
  urls: string[];
  /** The colour or style the photo should show. */
  variant?: string;
};

export type MatchRequest = ReadRequest | FindRequest | ImageRequest;

export type Reading = {
  name: string;
  query: string;
  detail: string;
  confidence: 'high' | 'medium' | 'low';
  /** Why there's no product, when there isn't one. */
  problem: 'none' | 'too dark' | 'too blurry' | 'no product' | 'several things';
};

export type StoreOffer = { store: string; price: string; url?: string };

export type Candidate = {
  name: string;
  price: string;
  store: string;
  url?: string;
  image?: string;
  upc?: string;
  /** This listing's colour or style. */
  color?: string;
  /** Colours or styles the product comes in, as seen in results (includes `color`). */
  variants?: string[];
  /** What the variants are: "Color", "Storage", "Scent". */
  optionLabel?: string;
  /** Whether picking a variant should change the photo. */
  optionChangesLook?: boolean;
  /** "best match, 92%" on the first; what's different on the rest. */
  tag: string;
  /** 0–100. */
  confidence: number;
  others: StoreOffer[];
};

export type MatchErrorCode = 'not_configured' | 'bad_request' | 'refused' | 'upstream' | 'too_large';

export type ReadResponse = { ok: true; reading: Reading };
export type FindResponse = { ok: true; found: boolean; candidates: Candidate[] };
export type ImageResponse = { ok: true; image: string | null };
export type ErrorResponse = { ok: false; code: MatchErrorCode; message: string };
