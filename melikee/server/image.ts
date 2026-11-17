/**
 * Product photos. Web search results carry text, not pictures, so a listing
 * usually comes back from `find` without an image. This fills one in:
 *
 *   1. Read the store pages directly for their share image (og:image,
 *      twitter:image, or the JSON-LD product image). Quick and free, but the
 *      big stores often answer bots with a captcha.
 *   2. If that finds nothing, have Claude search for the product and read
 *      the result pages (manufacturer, other stores, reviews) the same way.
 *
 * Every URL is checked before it's returned: it has to answer as an image.
 */
import { betaZodOutputFormat } from '@anthropic-ai/sdk/helpers/beta/zod';
import * as z from 'zod';

import { BASE, client } from './match';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';
const PAGE_MS = 4000;
const CHECK_MS = 3500;
const MAX_HTML = 800_000;

function timeout(ms: number) {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  return { signal: c.signal, done: () => clearTimeout(t), abort: () => c.abort() };
}

export function httpsUrl(raw: string | undefined | null, base?: string): string | undefined {
  if (!raw) return undefined;
  try {
    const u = new URL(raw.trim().replace(/&amp;/g, '&'), base);
    if (u.protocol === 'http:') u.protocol = 'https:';
    return u.protocol === 'https:' && u.hostname.includes('.') && /[a-z]/i.test(u.hostname.split('.').pop() ?? '') ? u.toString() : undefined;
  } catch {
    return undefined;
  }
}

export type ImageCheck = 'ok' | 'bad' | 'unknown';

/**
 * Does this URL answer as a picture? 'unknown' when the host won't talk to a
 * server (403, timeout): a browser may still load it, so it isn't thrown away.
 */
export async function checkImage(url: string): Promise<ImageCheck> {
  const t = timeout(CHECK_MS);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'image/*', Range: 'bytes=0-4095' }, signal: t.signal, redirect: 'follow' });
    const type = res.headers.get('content-type') ?? '';
    t.abort(); // headers are enough
    if (res.ok) return /^image\/(?!svg)/i.test(type) ? 'ok' : 'bad';
    return res.status === 404 || res.status === 410 ? 'bad' : 'unknown';
  } catch {
    return 'unknown';
  } finally {
    t.done();
  }
}

/** The share image a store page declares for itself, if the page will load for a server. */
export async function pageImage(pageUrl: string): Promise<string[]> {
  const t = timeout(PAGE_MS);
  try {
    const res = await fetch(pageUrl, { headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'en-US,en;q=0.9' }, signal: t.signal, redirect: 'follow' });
    if (!res.ok || !/html/i.test(res.headers.get('content-type') ?? '')) return [];
    const html = (await res.text()).slice(0, MAX_HTML);
    return imagesInHtml(html, res.url || pageUrl);
  } catch {
    return [];
  } finally {
    t.done();
  }
}

export function imagesInHtml(html: string, base: string): string[] {
  const found: string[] = [];
  const meta = /<meta\b[^>]*>/gi;
  for (const tag of html.match(meta) ?? []) {
    const key = /(?:property|name|itemprop)\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1]?.toLowerCase();
    if (!key || !['og:image', 'og:image:secure_url', 'og:image:url', 'twitter:image', 'twitter:image:src', 'image'].includes(key)) continue;
    const content = /content\s*=\s*["']([^"']+)["']/i.exec(tag)?.[1];
    const u = httpsUrl(content, base);
    if (u) found.push(u);
  }
  // JSON-LD Product: "image": "https://…" or ["https://…"] or { "url": "…" }
  for (const m of html.matchAll(/<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi)) {
    const img = /"image"\s*:\s*(?:\[\s*)?(?:\{[^}]*?"(?:url|contentUrl)"\s*:\s*)?"([^"]+)"/i.exec(m[1])?.[1];
    const u = httpsUrl(img?.replace(/\\\//g, '/'), base);
    if (u) found.push(u);
  }
  return [...new Set(found)];
}

const PicksSchema = z.object({
  images: z.array(z.string()).describe('Direct https URLs of photos of this exact product that you saw, best first, at most three. [] if none.'),
});

/**
 * Claude searches for the product. Search results are text, so its own image
 * picks are rare; the useful part is the result pages, which are read here for
 * their share image (manufacturer and review sites rarely block servers).
 */
async function searchImages(name: string): Promise<{ images: string[]; pages: string[] }> {
  const ask = `Search for this product so a wishlist app can show its photo: ${name}
Prefer the manufacturer's own product page, then major retailers and well-known review sites. One or two searches.
If a result shows a direct image URL (jpg, png or webp) of this exact product, list it; otherwise return [].`;
  const message = await client()
    .beta.messages.stream({
      ...BASE,
      max_tokens: 2000,
      tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 2 }],
      output_config: { effort: 'low', format: betaZodOutputFormat(PicksSchema) },
      messages: [{ role: 'user', content: ask }],
    })
    .finalMessage();
  const pages: string[] = [];
  for (const block of message.content) {
    if (block.type !== 'web_search_tool_result' || !Array.isArray(block.content)) continue;
    for (const r of block.content as { url?: string }[]) {
      const u = httpsUrl(r.url);
      if (u) pages.push(u);
    }
  }
  const images = (message.parsed_output?.images ?? []).map((u) => httpsUrl(u)).filter((u): u is string => !!u);
  return { images, pages: [...new Set(pages)] };
}

async function checkAll(cands: string[]) {
  const list = [...new Set(cands)].slice(0, 10);
  const checks = await Promise.all(list.map(checkImage));
  return list.map((url, i) => ({ url, check: checks[i] }));
}

export async function findImage(name: string, rawUrls: string[]): Promise<string | null> {
  const started = Date.now();
  const urls = [...new Set(rawUrls.map((u) => httpsUrl(u)).filter((u): u is string => !!u))].slice(0, 3);
  // 1. The store pages themselves.
  const fromStores = await checkAll((await Promise.all(urls.map(pageImage))).flat());
  const sure = fromStores.find((c) => c.check === 'ok');
  if (sure) {
    console.log(`[image] store page ${Date.now() - started}ms`);
    return sure.url;
  }
  // 2. Search, then read the result pages.
  let fromSearch: { url: string; check: ImageCheck }[] = [];
  try {
    const { images, pages } = await searchImages(name);
    const scraped = (await Promise.all(pages.slice(0, 8).map(pageImage))).map((l) => l[0]).filter((u): u is string => !!u);
    fromSearch = await checkAll([...images, ...scraped]);
    console.log(`[image] search: ${pages.length} pages, ${images.length} picks, ${scraped.length} scraped, ok=${fromSearch.filter((c) => c.check === 'ok').length}`);
  } catch (e) {
    console.error('[image] search failed', (e as Error)?.message);
  }
  const pick = fromSearch.find((c) => c.check === 'ok') ?? [...fromStores, ...fromSearch].find((c) => c.check === 'unknown');
  console.log(`[image] ${pick ? pick.check : 'none'} ${Date.now() - started}ms`);
  return pick?.url ?? null;
}

/** Drops listing images that are plainly broken (404, not an image). */
export async function screenImages<T extends { image?: string }>(cands: T[]): Promise<T[]> {
  return Promise.all(
    cands.map(async (c) => {
      if (!c.image) return c;
      return (await checkImage(c.image)) === 'bad' ? { ...c, image: undefined } : c;
    }),
  );
}
