/**
 * POST /api/recognize — the only server MeLikee has.
 *
 * It exists for one reason: the Anthropic API key must never ship inside the
 * app. Anything in the bundle is readable by anyone who installs it, so the two
 * Claude passes that turn a photo, a barcode or a spoken sentence into real
 * products run here instead, and the app only ever sees the answer.
 *
 * GET returns a health check, so you can tell "the endpoint isn't deployed"
 * apart from "the endpoint has no key" from a browser address bar.
 */
import { isConfigured, probe, read, recognize } from '../src/services/recognition/server';
import type {
  ProductReading,
  RecognizeImage,
  RecognizeRequest,
} from '../src/services/recognition/contract';

/**
 * Typed structurally rather than against `@vercel/node`, so the app does not
 * take a build-time dependency on its host. This is the shape every Node
 * serverless runtime provides.
 */
type Req = {
  method?: string;
  body?: unknown;
  query?: Record<string, string | string[] | undefined>;
  headers: Record<string, string | string[] | undefined>;
};

type Res = {
  status: (code: number) => Res;
  json: (body: unknown) => void;
  setHeader: (key: string, value: string) => void;
  end: () => void;
};

/** Photo captures are the big ones; anything past this is not a phone photo. */
const MAX_IMAGE_BYTES = 4_000_000;

const MEDIA_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (req.method === 'GET') {
    const base = { ok: true, service: 'melikee-recognize', configured: isConfigured() };
    // `?probe=1` spends a fraction of a cent to prove the key actually works,
    // rather than only that one is present.
    if (req.query?.probe) {
      res.status(200).json({ ...base, probe: await probe() });
      return;
    }
    res.status(200).json(base);
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ ok: false, code: 'bad_request', message: 'POST or GET.' });
    return;
  }

  const parsed = parseRequest(req.body);
  if ('error' in parsed) {
    res.status(400).json({ ok: false, code: 'bad_request', message: parsed.error });
    return;
  }

  // `read` answers in about four seconds and `listings` in about twenty, so
  // the app asks for them separately and fills the gap with the product name.
  const result =
    parsed.request.mode === 'read'
      ? await read(parsed.request.image)
      : await recognize(parsed.request);

  // A lookup that found nothing is still a successful round trip — the app has
  // copy for every one of these codes, so they travel as 200s with `ok: false`
  // rather than as HTTP errors the client would have to guess at.
  res.status(result.ok || result.code !== 'bad_request' ? 200 : 400).json(result);
}

function parseRequest(raw: unknown): { request: RecognizeRequest } | { error: string } {
  let body = raw;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return { error: 'Body was not JSON.' };
    }
  }
  if (!body || typeof body !== 'object') return { error: 'Body was missing.' };

  const b = body as Record<string, unknown>;

  if (b.mode === 'scan') {
    const upc = typeof b.upc === 'string' ? b.upc.trim() : '';
    if (!upc) return { error: 'scan needs a upc.' };
    return { request: { mode: 'scan', upc } };
  }

  if (b.mode === 'say') {
    const transcript = typeof b.transcript === 'string' ? b.transcript.trim() : '';
    if (!transcript) return { error: 'say needs a transcript.' };
    return { request: { mode: 'say', transcript } };
  }

  if (b.mode === 'listings') {
    const reading = b.reading as Partial<ProductReading> | undefined;
    if (!reading || typeof reading.searchQuery !== 'string' || !Array.isArray(reading.visibleText)) {
      return { error: 'listings needs a reading.' };
    }
    return { request: { mode: 'listings', reading: reading as ProductReading } };
  }

  if (b.mode === 'snap' || b.mode === 'read') {
    const image = b.image as Partial<RecognizeImage> | undefined;
    if (!image || typeof image.data !== 'string' || !image.data) return { error: `${b.mode} needs an image.` };
    if (typeof image.mediaType !== 'string' || !MEDIA_TYPES.includes(image.mediaType)) {
      return { error: `${b.mode} needs a jpeg, png or webp image.` };
    }
    // Base64 runs about 4/3 the size of the bytes it encodes.
    if (image.data.length * 0.75 > MAX_IMAGE_BYTES) return { error: 'That image is too big.' };
    return {
      request: {
        mode: b.mode,
        image: { data: image.data, mediaType: image.mediaType as RecognizeImage['mediaType'] },
      },
    };
  }

  return { error: 'mode must be scan, say, snap, read or listings.' };
}
