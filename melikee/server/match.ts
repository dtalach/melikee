/**
 * Product matching, server side. Never bundled into the app: it lives outside
 * `src/`, and only `api/match.ts` imports it, so the API key stays here.
 *
 *   read — Claude looks at the photo and reads what's printed on it (brand,
 *          model number, colour) into a name and a search query. Reading, not
 *          visual similarity: MeLikee has no catalogue of product images, and
 *          most things people photograph have their name on them.
 *   find — Claude with web search (and web fetch, for a pasted link) turns a
 *          name, barcode or sentence into current listings: price, store,
 *          link, picture, plus near matches.
 *
 * Lessons from the earlier build, kept: low effort (the quality comes from
 * what the search sees, not from deliberating), at most three searches, and
 * `pause_turn` continued rather than treated as failure — a capture that ran
 * four searches plus pauses hit the 60-second function limit.
 */
import Anthropic from '@anthropic-ai/sdk';
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod';

import { screenImages } from './image';
import type { Candidate, FindRequest, ImagePayload, MatchErrorCode, Reading } from '../src/lib/matchContract';

const MODEL = process.env.MELIKEE_MODEL || 'claude-opus-5-5';
const MAX_CANDIDATES = 3;

export class MatchError extends Error {
  constructor(
    readonly code: MatchErrorCode,
    message: string,
  ) {
    super(message);
  }
}

let cached: Anthropic | null = null;
export function client() {
  if (!cached) cached = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return cached;
}

export function isConfigured() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

/**
 * Shared request options. Server-side fallbacks re-run a declined request on
 * another model inside the same call, so a classifier false positive on an
 * ordinary product photo doesn't become a failed capture.
 */
export const BASE = {
  model: MODEL,
  betas: ['server-side-fallback-2026-07-01'],
  fallbacks: 'default' as const,
};

// ── read ────────────────────────────────────────────────────────────────────

const ReadingSchema = z.object({
  brand: z.string().describe('Brand as printed or clearly identifiable. "" if unsure.'),
  productName: z.string().describe('Product name, e.g. "WH-1000XM6 headphones". "" if unsure.'),
  modelNumber: z.string().describe('Model or SKU printed on it. "" if none is visible.'),
  color: z.string().describe('Colour or colourway. "" if not relevant.'),
  searchQuery: z.string().describe('What a shopper would type to find this exact item. "" if there is no product.'),
  confidence: z.enum(['high', 'medium', 'low']),
  problem: z.enum(['none', 'too dark', 'too blurry', 'no product', 'several things']),
});

const READ_SYSTEM = `You identify products in photos for a wishlist app. Someone just pointed their phone at something they want.

Read what is actually on the product and its packaging: the brand mark, the model number, the colourway, the size. Small text matters as much as large text; a model number is often the difference between the right product and last year's.

Never return a brand or a model number you cannot see or clearly recognise. An honest "" beats a plausible wrong answer: the app can recover from "not sure", but a confidently wrong product ends up on a real birthday list.

If several different products fill the frame, set problem to "several things" and describe the most central one. If there's no product, or the photo is too dark or blurry to read, say so in problem and leave the other fields "".`;

export async function readPhoto(image: ImagePayload): Promise<Reading> {
  const message = await client()
    .beta.messages.stream({
      ...BASE,
      max_tokens: 4000,
      system: READ_SYSTEM,
      output_config: { effort: 'low', format: betaZodOutputFormat(ReadingSchema) },
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.data } },
            { type: 'text', text: 'What product is this?' },
          ],
        },
      ],
    })
    .finalMessage();

  check(message.stop_reason, 'reading the photo');
  const r = message.parsed_output;
  if (!r) throw new MatchError('upstream', 'The photo reading came back empty.');

  const name = [r.brand, r.productName].filter(Boolean).join(' ').trim();
  return {
    name,
    query: r.searchQuery || name,
    detail: [r.modelNumber && `model ${r.modelNumber}`, r.color].filter(Boolean).join(', '),
    confidence: r.confidence,
    problem: name || r.searchQuery ? r.problem : r.problem === 'none' ? 'no product' : r.problem,
  };
}

// ── find ────────────────────────────────────────────────────────────────────

const ListingsSchema = z.object({
  found: z.boolean().describe('False if nothing buyable turned up, or the link is not a product page.'),
  candidates: z
    .array(
      z.object({
        name: z.string().describe('Full product name as the store lists it.'),
        price: z.string().describe('Current price as shown, e.g. "$79.99". "" if not shown.'),
        store: z.string().describe('Retailer name, e.g. "Target".'),
        url: z.string().describe('Link to the product page at that store. "" if none.'),
        image: z.string().describe('Direct https URL of a product photo from the results. "" if none.'),
        upc: z.string().describe('UPC/EAN if it appeared in the results. "" otherwise.'),
        color: z.string().describe('Which option this listing is, e.g. "Silver", "Purple Dust", "256GB". "" if the product has no options.'),
        variants: z
          .array(z.string())
          .describe('The options this exact product comes in, as named in the results, e.g. ["Black", "Silver"]. One kind only: colour if it has colours, else whatever choice matters most (storage, capacity, scent). Never clothing or shoe sizes. At most 8, including this one. [] if none were seen. Never search again just to fill this in.'),
        optionLabel: z.string().describe('What the options are, one or two words: "Color", "Storage", "Capacity", "Scent". "" if no options.'),
        optionChangesLook: z.boolean().describe('True if the options look different in a photo (colours, patterns, finishes); false for storage, capacity, scent and the like.'),
        confidence: z.number().describe('0-100: how sure this is the item that was asked for.'),
        reason: z.string().describe('For alternatives: what is different, at most five lowercase words, e.g. "last year\'s model". "" for the first.'),
        others: z
          .array(z.object({ store: z.string(), price: z.string(), url: z.string() }))
          .describe('Other retailers you already saw carrying the same item, at most two. Never search again just to fill this in.'),
      }),
    )
    .describe('Best match first, then up to two near misses a shopper would want to see.'),
});

const FIND_SYSTEM = `You find where to buy products for a wishlist app used by teenagers in the US. Someone is standing still, waiting.

Use web search to find current retail listings. Every price, store and link must come from a result you actually saw; never reconstruct a price from memory. Prefer well-known US retailers.

Put the best match first. What the person gave you is evidence: a model number, barcode or colour outranks popularity. If they gave a colour, pick the listing in that colour and set color to it; when the product comes in several colours, list the ones you saw in variants so they can choose. Then add up to two near misses worth showing (last year's model, a different colour, a different size), saying what differs in reason.

Be quick. Two searches is usually enough. Answering with one solid, priced candidate beats answering slowly with three.`;

function brief(req: FindRequest): string {
  switch (req.source) {
    case 'barcode':
      return `A barcode was scanned in a shop: ${req.upc}. Identify the product from that number, then find current listings. If the number turns up nothing you can trust, set found to false; do not guess a product from the digits.`;
    case 'voice':
      return `Someone said what they want, transcribed as: "${req.query}". It may be misheard or casual. Work out which product they mean and find current listings. If it could be two different products, list both and say which is which in reason.`;
    case 'link':
      return `Someone pasted this link: ${req.url}\nFetch it. If it is a product page, return that product (name, price, store and the image from the page) first, then other stores if you see them. If it is not a product page, set found to false.`;
    case 'alternates':
      return `Someone saved "${req.query}" but says it's the wrong product. Suggest the three closest real products they might have meant instead (other colours, models, or similar items), each with a current listing.`;
    case 'photo':
    case 'screenshot':
      return `Someone photographed a product they want. It was read as: ${req.query}${req.hint ? ` (${req.hint})` : ''}. Find current listings for that exact item.`;
    default:
      return `Find current listings for: ${req.query}`;
  }
}

export async function findListings(req: FindRequest): Promise<{ found: boolean; candidates: Candidate[] }> {
  const tools: Anthropic.Beta.BetaToolUnion[] = [{ type: 'web_search_20260209', name: 'web_search', max_uses: req.thorough ? 5 : 3 }];
  if (req.url) tools.push({ type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 1, allowed_domains: [hostOf(req.url)] });

  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: 'user', content: brief(req) }];
  const params = {
    ...BASE,
    max_tokens: 8000,
    system: FIND_SYSTEM,
    tools,
    output_config: { effort: req.thorough ? ('medium' as const) : ('low' as const), format: betaZodOutputFormat(ListingsSchema) },
  };

  // A long search can stop with `pause_turn`: unfinished, not failed. Hand the
  // work back and let it continue, at most three times.
  for (let turn = 0; turn < 3; turn++) {
    const started = Date.now();
    const message = await client()
      .beta.messages.stream({ ...params, messages })
      .finalMessage();
    console.log(`[match] find ${req.source} turn ${turn + 1} ${Date.now() - started}ms stop=${message.stop_reason}`);

    if (message.stop_reason === 'pause_turn') {
      messages.push({ role: 'assistant', content: message.content });
      continue;
    }
    check(message.stop_reason, 'finding listings');
    const out = message.parsed_output;
    if (!out) throw new MatchError('upstream', 'The search came back empty.');
    return { found: out.found && out.candidates.length > 0, candidates: await screenImages(shape(out.candidates, req.upc)) };
  }
  throw new MatchError('upstream', 'The search kept pausing without finishing.');
}

function shape(list: z.infer<typeof ListingsSchema>['candidates'], upc?: string): Candidate[] {
  return list
    .filter((c) => c.name.trim())
    .slice(0, MAX_CANDIDATES)
    .map((c, i) => {
      const confidence = Math.max(0, Math.min(100, Math.round(c.confidence)));
      return {
        name: c.name.trim(),
        price: c.price.trim() || '—',
        store: c.store.trim() || 'online',
        url: https(c.url),
        image: https(c.image),
        upc: c.upc.trim() || upc || undefined,
        color: c.color.trim() || undefined,
        variants: [...new Set(c.variants.map((v) => v.trim()).filter((v) => v && v.length < 40))].slice(0, 8),
        optionLabel: c.optionLabel.trim().slice(0, 20) || undefined,
        optionChangesLook: c.optionChangesLook,
        tag: i === 0 ? `best match, ${confidence}%` : c.reason.trim() || 'another option',
        confidence,
        others: c.others
          .filter((o) => o.store.trim())
          .slice(0, 2)
          .map((o) => ({ store: o.store.trim(), price: o.price.trim() || '—', url: https(o.url) })),
      };
    });
}

function check(stop: string | null, what: string) {
  if (stop === 'refusal') throw new MatchError('refused', `Declined while ${what}.`);
  if (stop === 'max_tokens') throw new MatchError('upstream', `Ran out of room while ${what}.`);
}

function https(u: string) {
  const s = u.trim();
  return /^https:\/\/\S+$/i.test(s) ? s : undefined;
}

export function hostOf(url: string) {
  return url.replace(/^https?:\/\//i, '').split(/[/?#]/)[0].toLowerCase();
}

export function describeError(error: unknown): { code: MatchErrorCode; message: string } {
  if (error instanceof MatchError) return { code: error.code, message: error.message };
  if (error instanceof Anthropic.AuthenticationError) return { code: 'not_configured', message: 'The API key was rejected.' };
  if (error instanceof Anthropic.RateLimitError) return { code: 'upstream', message: 'Too many requests right now.' };
  if (error instanceof Anthropic.BadRequestError) return { code: 'upstream', message: `Bad request: ${error.message}` };
  if (error instanceof Anthropic.APIError) return { code: 'upstream', message: `API error ${error.status ?? ''}`.trim() };
  return { code: 'upstream', message: error instanceof Error ? error.message : 'Unknown error' };
}
