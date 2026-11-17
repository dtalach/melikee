/**
 * Product photos. Web search results carry text, not pictures, so a listing
 * usually comes back from `find` without an image. This fills one in:
 *
 *   1. Read the store pages directly for their share image (og:image,
 *      twitter:image, or the JSON-LD product image). Quick and free, but the
 *      big stores often answer bots with a captcha.
 *   2. If that finds nothing, ask Claude to fetch the pages (or search) and
 *      pick out the product photo.
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
  images: z.array(z.string()).describe('Direct https URLs of photos of this exact product, best first, at most three. [] if none were seen.'),
});

/** Claude fetches the store pages (or searches) and reads off the product photo URLs. */
async function claudeImages(name: string, urls: string[]): Promise<string[]> {
  const hosts = [...new Set(urls.map((u) => new URL(u).hostname))];
  const tools: Parameters<ReturnType<typeof client>['beta']['messages']['stream']>[0]['tools'] = [{ type: 'web_search_20260209', name: 'web_search', max_uses: 2 }];
  if (hosts.length) tools.push({ type: 'web_fetch_20260209', name: 'web_fetch', max_uses: 2, allowed_domains: hosts });
  const ask = `Find a photo of this product for a wishlist: ${name}
${urls.length ? `Its store pages:\n${urls.join('\n')}\nFetch one and take the main product image URL from it (og:image, or the product gallery's first image).` : ''}
If a page won't load, search for the product and use an image URL from the manufacturer's or a major retailer's listing.
Return only URLs you actually saw in a page or result, pointing straight at an image file (jpg, png or webp), never a page.`;
  const message = await client()
    .beta.messages.stream({
      ...BASE,
      max_tokens: 3000,
      tools,
      output_config: { effort: 'low', format: betaZodOutputFormat(PicksSchema) },
      messages: [{ role: 'user', content: ask }],
    })
    .finalMessage();
  return (message.parsed_output?.images ?? []).map((u) => httpsUrl(u)).filter((u): u is string => !!u);
}

/** The first candidate that answers as an image; a maybe if none is certain. */
async function firstGood(cands: string[]): Promise<string | null> {
  if (!cands.length) return null;
  const checks = await Promise.all(cands.slice(0, 6).map(checkImage));
  const ok = cands.findIndex((_, i) => checks[i] === 'ok');
  if (ok >= 0) return cands[ok];
  const maybe = cands.findIndex((_, i) => checks[i] === 'unknown');
  return maybe >= 0 ? cands[maybe] : null;
}

export async function findImage(name: string, rawUrls: string[]): Promise<string | null> {
  const urls = [...new Set(rawUrls.map((u) => httpsUrl(u)).filter((u): u is string => !!u))].slice(0, 3);
  const scraped = (await Promise.all(urls.map(pageImage))).flat();
  // Only a verified scrape counts here: a page that blocked us didn't give us anything.
  const checks = await Promise.all(scraped.slice(0, 6).map(checkImage));
  const sure = scraped.find((_, i) => checks[i] === 'ok');
  if (sure) return sure;
  try {
    return await firstGood(await claudeImages(name, urls));
  } catch (e) {
    console.error('[image] claude failed', (e as Error)?.message);
    return null;
  }
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
