/**
 * Product recognition, server side.
 *
 * Two passes, both Claude:
 *
 *   1. **Read the product.** Opus 5 looks at the photo and reads what is
 *      actually printed on it — brand, model number, category, every legible
 *      string — into a fixed schema. This is deliberately *reading* rather than
 *      visual similarity search: a similarity index can only match against a
 *      catalogue of product images you already own, and MeLikee owns none. Most
 *      things a teen photographs have their own name written on them.
 *
 *   2. **Find where to buy it.** A second Opus 5 call with the server-side web
 *      search tool turns that reading into real, current listings — store,
 *      price, link — and ranks them. Barcode scans and spoken wants skip pass 1
 *      and go straight here, because a UPC and a sentence are already queries.
 *
 * This module never runs in the app. It lives in `src/` only so the app and the
 * serverless function can share one contract file; nothing under `src/screens`
 * or `src/store` imports it, so Metro never bundles it and the API key never
 * leaves the server.
 */
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import * as z from 'zod/v4';

import type {
  ProductMatch,
  ProductReading,
  RecognizeErrorCode,
  RecognizeImage,
  RecognizeRequest,
  RecognizeResponse,
} from './contract';

/**
 * Opus 5 for both passes. Reading a blurry model number off a box in bad light
 * is exactly the kind of perception where the frontier model earns its price,
 * and a wrong product is the failure the whole app is built to avoid. Both are
 * overridable so the cost can be tuned without a code change.
 */
const VISION_MODEL = process.env.MELIKEE_VISION_MODEL || 'claude-opus-5';
const SEARCH_MODEL = process.env.MELIKEE_SEARCH_MODEL || 'claude-opus-5';

/** Ceiling on candidates — the found card shows one, near-matches show the rest. */
const MAX_CANDIDATES = 4;

// ── Schemas ────────────────────────────────────────────────────────────────

/**
 * Every field is required and unknowns come back as `""` rather than being
 * omitted. Structured outputs are strict about optionality, and "" is easier to
 * reason about downstream than a field that may or may not exist.
 */
const ReadingSchema = z.object({
  brand: z.string().describe('Brand or maker, exactly as printed. "" if not visible.'),
  productName: z.string().describe('The product name as a shopper would say it. "" if unclear.'),
  modelNumber: z.string().describe('Model or SKU printed on the product or box. "" if none.'),
  category: z.string().describe('Plain-language category, e.g. "headphones", "running shoes".'),
  color: z.string().describe('The colourway as a shop would name it. "" if unclear.'),
  variant: z.string().describe('Size, capacity, edition or flavour. "" if none.'),
  visibleText: z.array(z.string()).describe('Every legible string on the product or packaging.'),
  confidence: z
    .enum(['high', 'medium', 'low'])
    .describe('high = a specific named product; medium = the category and probably the brand; low = a guess.'),
  searchQuery: z.string().describe('What you would type into a shop search box to find this exact thing.'),
});

const ListingsSchema = z.object({
  found: z.boolean().describe('False if the search turned up nothing buyable.'),
  candidates: z
    .array(
      z.object({
        name: z.string().describe('Product name as the retailer lists it, trimmed of marketing filler.'),
        price: z.string().describe('Current price with currency symbol, e.g. "$399". "" if no price was found.'),
        storeName: z.string().describe('The retailer with the best price you found, e.g. "Best Buy".'),
        otherStores: z
          .array(
            z.object({
              storeName: z.string(),
              price: z.string().describe('Current price with currency symbol. "" if the listing showed none.'),
              buyUrl: z.string().describe('Direct link to that retailer\'s product page. "" if none.'),
            }),
          )
          .describe('Up to three other retailers carrying the same item, with their own current prices. Empty if you only found one.'),
        buyUrl: z.string().describe('Direct link to the product page. "" if none was found.'),
        upc: z.string().describe('UPC/EAN if one appeared in the results. "" otherwise.'),
        reason: z
          .string()
          .describe(
            'Why this candidate is here, at most five lowercase words, no full stop — e.g. "last year\'s model", "different colour", "same thing, cheaper".',
          ),
        confidence: z.number().describe('0-100: how sure you are this is the product the user meant.'),
      }),
    )
    .describe('Best match first, at most four.'),
});

type Listings = z.infer<typeof ListingsSchema>;

// ── Prompts ────────────────────────────────────────────────────────────────

const VISION_SYSTEM = `You are the eye of a wishlist app. A user has photographed something they want, and your only job is to read what the product actually is.

Read, don't guess. Work from what is printed on the product and its packaging: the brand mark, the model number on the label or the underside of the box, the colourway name, the size or capacity. Look at small text as carefully as large text — a model number is usually the difference between the right product and last year's.

If several products are in frame, describe the one that is centred, largest, or most clearly the subject. If a person is holding it, describe the object, not the person.

If there is no product in the frame at all, return confidence "low", empty strings throughout, and an empty searchQuery. Do not invent a product.

Never return a brand or a model number you cannot actually see. An honest "" beats a plausible wrong answer — the app can recover from "we're not sure", but a confidently wrong product ends up on a real birthday list.`;

const VISION_TASK = `Read this product. Fill every field: use "" for anything you cannot see rather than guessing.

For searchQuery, write the words a shopper would type to find this exact item — brand, product, model number, colour, size — in that order, no punctuation.`;

const SEARCH_SYSTEM = `You research products for a wishlist app and return where to buy them.

Use web search to find *current* retail listings. Rules:

- Every price, store name and link must come from a search result you actually saw. Never reconstruct a price from memory — a stale price shown as current is worse than no price.
- Prefer large retailers a teenager or their family can actually order from: the brand's own store, Best Buy, Target, Amazon, Walmart, REI, Apple, and equivalents in the user's market.
- Rank best match first. The first candidate is the one the app will show, so it must be the product the user meant, not the cheapest or the most popular.
- Fill the remaining slots with the near-misses a person would actually want to see: last year's model, a different colourway, a different size, a bundle. Say which in the reason field.
- If nothing buyable turns up, set found to false and return an empty candidates array. Do not pad the list.

The reason field is shown to the user under the price, so keep it to at most five lowercase words with no full stop.`;

// ── Client ─────────────────────────────────────────────────────────────────

let cached: Anthropic | null = null;

function client(): Anthropic {
  if (!cached) cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cached;
}

export function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Is the key real, and does this deployment have a route out to the API?
 *
 * `isConfigured` only proves a string is set — it says nothing about whether
 * that string is valid, funded, or reachable. This costs a fraction of a cent
 * and turns "the capture failed" into an answer before anyone photographs
 * anything.
 */
export async function probe(): Promise<{ reachable: boolean; model?: string; detail?: string }> {
  if (!isConfigured()) return { reachable: false, detail: 'No ANTHROPIC_API_KEY is set.' };
  try {
    const message = await client().messages.create({
      model: VISION_MODEL,
      max_tokens: 4,
      thinking: { type: 'disabled' },
      messages: [{ role: 'user', content: 'Reply with the word: ok' }],
    });
    return { reachable: true, model: message.model };
  } catch (error) {
    return { reachable: false, detail: describe(error).message };
  }
}

/** Thrown when a pass fails in a way the app should be told about by name. */
class RecognizeError extends Error {
  constructor(
    readonly code: RecognizeErrorCode,
    message: string,
  ) {
    super(message);
  }
}

// ── Pass 1: read the product ───────────────────────────────────────────────

async function readProduct(image: RecognizeImage): Promise<ProductReading> {
  // Thinking is off and effort is low on purpose. This pass is perception, not
  // reasoning — Opus 5 reads a label better with a bigger image than with a
  // longer thought, and the app is waiting on a human timescale.
  const message = await client().messages.parse({
    model: VISION_MODEL,
    max_tokens: 1024,
    thinking: { type: 'disabled' },
    system: VISION_SYSTEM,
    output_config: { effort: 'low', format: zodOutputFormat(ReadingSchema) },
    messages: [
      {
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
          { type: 'text', text: VISION_TASK },
        ],
      },
    ],
  });

  if (message.stop_reason === 'refusal') {
    throw new RecognizeError('refused', 'The model declined to describe this photo.');
  }
  if (message.stop_reason === 'max_tokens') {
    throw new RecognizeError('upstream', 'The vision pass ran out of tokens.');
  }
  if (!message.parsed_output) {
    throw new RecognizeError('upstream', `The vision pass returned nothing parseable (stop_reason ${message.stop_reason}).`);
  }
  return message.parsed_output;
}

// ── Pass 2: find where to buy it ───────────────────────────────────────────

function searchBrief(request: RecognizeRequest, reading?: ProductReading): string {
  if (request.mode === 'scan') {
    return `A barcode was scanned in a shop. The digits are ${request.upc}.

Search for that barcode number to identify the exact product, then find current listings for it. The digits are authoritative — if the barcode and a product name disagree, trust the barcode.`;
  }

  if (request.mode === 'say') {
    return `Someone said out loud what they want, and this is the transcription:

"${request.transcript}"

It may be misheard, casual, or incomplete. Work out what product they mean, then find current listings for it. If the words genuinely could mean two different products, put both in the list and say which is which in the reason.`;
  }

  const r = reading;
  if (!r) return 'Find current listings for the product described above.';

  const lines = [
    r.brand && `Brand: ${r.brand}`,
    r.productName && `Product: ${r.productName}`,
    r.modelNumber && `Model number: ${r.modelNumber}`,
    r.category && `Category: ${r.category}`,
    r.color && `Colour: ${r.color}`,
    r.variant && `Variant: ${r.variant}`,
    r.visibleText.length ? `Text visible on it: ${r.visibleText.join(' · ')}` : '',
  ].filter(Boolean);

  return `Someone photographed a product they want. Another model read the photo and reported:

${lines.join('\n')}

Reader's confidence: ${r.confidence}
Suggested query: ${r.searchQuery || r.productName || r.category}

Find current listings for this product. If the reading is confident, find that exact item. If it is only "medium" or "low", treat it as a description and offer the closest real products you can find, best first.`;
}

const WEB_SEARCH = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: 4,
} as const;

async function findListings(brief: string): Promise<Listings> {
  // Streamed rather than awaited in one shot: web search turns run long, and a
  // streamed request keeps the connection alive instead of tripping a timeout
  // halfway through a search the user is waiting on.
  const params = {
    model: SEARCH_MODEL,
    max_tokens: 6000,
    system: SEARCH_SYSTEM,
    tools: [WEB_SEARCH],
    output_config: { effort: 'medium' as const, format: zodOutputFormat(ListingsSchema) },
  };

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: brief }];

  // A long search can come back as `pause_turn` — the turn is unfinished, not
  // failed. Hand the assistant's own work back to it and let it carry on.
  for (let turn = 0; turn < 4; turn++) {
    const message = await client()
      .messages.stream({ ...params, messages })
      .finalMessage();

    if (message.stop_reason === 'refusal') {
      throw new RecognizeError('refused', 'The model declined to research this product.');
    }
    if (message.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: message.content });
      continue;
    }
    // Adaptive thinking shares the token budget with the answer, so a long
    // deliberation can leave no room to write the JSON. Worth naming, because
    // the fix is a number in this file rather than anything the user did.
    if (message.stop_reason === 'max_tokens') {
      throw new RecognizeError('upstream', `The search pass ran out of tokens (max_tokens ${params.max_tokens}).`);
    }
    if (!message.parsed_output) {
      throw new RecognizeError('upstream', `The search pass returned nothing parseable (stop_reason ${message.stop_reason}).`);
    }
    return message.parsed_output;
  }

  throw new RecognizeError('upstream', 'The search pass never finished.');
}

// ── Shaping ────────────────────────────────────────────────────────────────

/** "Best Buy + 2 stores" — the design's phrasing, with the singular fixed. */
function storesLine(storeName: string, others: number): string {
  if (!storeName) return others > 0 ? `${others} stores` : 'in stores';
  if (others <= 0) return storeName;
  return `${storeName} + ${others} ${others === 1 ? 'store' : 'stores'}`;
}

function toMatches(listings: Listings, fallbackUpc: string): ProductMatch[] {
  return listings.candidates.slice(0, MAX_CANDIDATES).map((c, index) => {
    const others = c.otherStores
      .filter((store) => store.storeName.trim())
      .slice(0, 3)
      .map((store) => ({
        storeName: store.storeName.trim(),
        price: store.price.trim() || '—',
        buyUrl: store.buyUrl.trim() || undefined,
      }));

    return {
      name: c.name.trim(),
      // A listing without a price still belongs on the list — the design
      // already has a resting state for a price it does not know.
      price: c.price.trim() || '—',
      stores: storesLine(c.storeName.trim(), others.length),
      storeName: c.storeName.trim() || 'unknown store',
      upc: c.upc.trim() || fallbackUpc,
      // The top card says how sure we are, in the design's voice. The rest say
      // what makes them different, which is the only reason to look at them.
      reason:
        index === 0
          ? `best match, ${Math.round(clamp(c.confidence, 0, 100))}%`
          : c.reason.trim() || 'another option',
      buyUrl: c.buyUrl.trim() || undefined,
      otherStores: others.length ? others : undefined,
      confidence: clamp(c.confidence, 0, 100),
    };
  });
}

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, Number.isFinite(n) ? n : 0));

// ── Cache ──────────────────────────────────────────────────────────────────

/**
 * Scanning the same barcode twice in a shop is normal behaviour, and a repeat
 * lookup costs a real search. A warm serverless instance keeps recent answers
 * for half an hour; a cold one simply doesn't, which is the right failure.
 * Photos are not cached — every photo is a different photo.
 */
const CACHE_TTL_MS = 30 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; value: RecognizeResponse }>();

function cacheKey(request: RecognizeRequest): string | null {
  if (request.mode === 'scan') return `scan:${request.upc}`;
  if (request.mode === 'say') return `say:${request.transcript.trim().toLowerCase()}`;
  return null;
}

function readCache(key: string | null): RecognizeResponse | null {
  if (!key) return null;
  const hit = cache.get(key);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return hit.value;
}

function writeCache(key: string | null, value: RecognizeResponse) {
  if (!key || !value.ok) return;
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
  cache.set(key, { at: Date.now(), value });
}

// ── Entry point ────────────────────────────────────────────────────────────

/**
 * Turns whatever went wrong into something a person can act on. The SDK's
 * errors carry the API's own status and message, and collapsing those into
 * "recognition failed" is how a one-line config mistake becomes an afternoon.
 */
function describe(error: unknown): { code: RecognizeErrorCode; message: string } {
  if (error instanceof RecognizeError) return { code: error.code, message: error.message };

  if (error instanceof Anthropic.APIError) {
    const detail =
      typeof error.error === 'object' && error.error && 'error' in error.error
        ? ((error.error as { error?: { message?: string } }).error?.message ?? error.message)
        : error.message;
    return { code: 'upstream', message: `Anthropic API ${error.status ?? '?'}: ${detail}` };
  }

  return { code: 'upstream', message: error instanceof Error ? error.message : 'Recognition failed.' };
}

export async function recognize(request: RecognizeRequest): Promise<RecognizeResponse> {
  if (!isConfigured()) {
    return { ok: false, code: 'not_configured', message: 'The recognition service has no API key.' };
  }

  const key = cacheKey(request);
  const hit = readCache(key);
  if (hit) return hit;

  const startedAt = Date.now();
  let readMs: number | undefined;

  try {
    let reading: ProductReading | undefined;

    if (request.mode === 'snap') {
      reading = await readProduct(request.image);
      readMs = Date.now() - startedAt;
      // Nothing in the frame. This is a real answer, not a failure — the app
      // has copy for it, and it is much better than searching for "".
      if (!reading.searchQuery && !reading.productName && !reading.category) {
        return { ok: false, code: 'no_product', message: 'No product in that photo.' };
      }
    }

    const listings = await findListings(searchBrief(request, reading));
    const fallbackUpc = request.mode === 'scan' ? request.upc : '—';
    const candidates = toMatches(listings, fallbackUpc);

    if (!listings.found || candidates.length === 0) {
      return { ok: false, code: 'no_match', message: 'Nothing buyable turned up.' };
    }

    const response: RecognizeResponse = {
      ok: true,
      candidates,
      reading,
      checkedAt: new Date().toISOString(),
      // How long each pass took. The app ignores this; it exists so the first
      // question after a slow capture — which half was slow? — has an answer.
      timing: { readMs, searchMs: Date.now() - startedAt - (readMs ?? 0), totalMs: Date.now() - startedAt },
    };
    writeCache(key, response);
    return response;
  } catch (error) {
    const described = describe(error);
    console.error('[recognize]', request.mode, described.code, described.message);
    return { ok: false, ...described, timing: { readMs, totalMs: Date.now() - startedAt } };
  }
}
