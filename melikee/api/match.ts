/**
 * POST /api/match — MeLikee's only server. It exists so the Anthropic API key
 * never ships inside the app. GET is a health check: `{ configured }` says
 * whether ANTHROPIC_API_KEY is set on this deployment.
 */
import type { MatchRequest } from '../src/lib/matchContract';
import { findImage } from '../server/image';
import { describeError, findListings, isConfigured, readPhoto } from '../server/match';

type Req = { method?: string; body?: unknown };
type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (key: string, value: string) => void;
  end: () => void;
};

/** A downscaled phone photo is ~200–400KB; anything near Vercel's 4.5MB body cap isn't one. */
const MAX_IMAGE_CHARS = 4_000_000;
const MEDIA = ['image/jpeg', 'image/png', 'image/webp'];

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method === 'GET') return res.status(200).json({ ok: true, service: 'melikee-match', configured: isConfigured() });
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'bad_request', message: 'POST or GET.' });

  if (!isConfigured()) {
    return res.status(503).json({ ok: false, code: 'not_configured', message: 'ANTHROPIC_API_KEY is not set on this deployment.' });
  }

  const body = (typeof req.body === 'string' ? safeParse(req.body) : req.body) as MatchRequest | null;
  const problem = validate(body);
  if (problem) return res.status(problem.status).json({ ok: false, code: problem.code, message: problem.message });

  try {
    if (body!.mode === 'read') {
      return res.status(200).json({ ok: true, reading: await readPhoto(body!.image) });
    }
    if (body!.mode === 'image') {
      return res.status(200).json({ ok: true, image: await findImage(body!.name, body!.urls) });
    }
    const out = await findListings(body!);
    return res.status(200).json({ ok: true, ...out });
  } catch (error) {
    const e = describeError(error);
    console.error(`[match] ${body!.mode} failed: ${e.code} ${e.message}`);
    return res.status(e.code === 'not_configured' ? 503 : 502).json({ ok: false, ...e });
  }
}

function validate(b: MatchRequest | null): { status: number; code: 'bad_request' | 'too_large'; message: string } | null {
  if (!b || typeof b !== 'object') return { status: 400, code: 'bad_request', message: 'Expected a JSON body.' };
  if (b.mode === 'read') {
    if (!b.image || !MEDIA.includes(b.image.mediaType) || typeof b.image.data !== 'string') {
      return { status: 400, code: 'bad_request', message: 'read needs image.mediaType and image.data (base64).' };
    }
    if (b.image.data.length > MAX_IMAGE_CHARS) return { status: 413, code: 'too_large', message: 'Image too large.' };
    return null;
  }
  if (b.mode === 'find') {
    const text = (s?: string) => typeof s === 'string' && s.trim().length > 0 && s.length < 500;
    if (b.source === 'barcode' && !/^\d{6,14}$/.test(b.upc ?? '')) return { status: 400, code: 'bad_request', message: 'barcode needs upc digits.' };
    if (b.source === 'link' && !/^https?:\/\/\S+$/i.test(b.url ?? '')) return { status: 400, code: 'bad_request', message: 'link needs an http(s) url.' };
    if (b.source !== 'barcode' && b.source !== 'link' && !text(b.query)) return { status: 400, code: 'bad_request', message: 'find needs a query.' };
    if (b.hint != null && typeof b.hint !== 'string') return { status: 400, code: 'bad_request', message: 'hint must be text.' };
    return null;
  }
  if (b.mode === 'image') {
    if (typeof b.name !== 'string' || !b.name.trim() || b.name.length > 300) return { status: 400, code: 'bad_request', message: 'image needs a name.' };
    if (!Array.isArray(b.urls) || b.urls.length > 5 || b.urls.some((u) => typeof u !== 'string' || !/^https?:\/\/\S+$/i.test(u))) {
      return { status: 400, code: 'bad_request', message: 'image needs up to five http(s) urls.' };
    }
    return null;
  }
  return { status: 400, code: 'bad_request', message: 'mode must be read, find or image.' };
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
}
