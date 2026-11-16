/**
 * POST /api/dibs — a gifter claims or releases a shiny. One claim per shiny,
 * enforced atomically. The wisher's app never calls this or reads the result.
 */
import type { DibsRequest } from '../src/lib/pagesContract';
import { dibs, isConfigured, validHandle } from '../server/pages';

type Req = { method?: string; body?: unknown };
type Res = { status: (c: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void; end: () => void };

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'bad_request', message: 'POST.' });
  if (!isConfigured()) return res.status(503).json({ ok: false, code: 'not_configured', message: 'Shared lists need a database on this deployment.' });

  const b = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as DibsRequest | null;
  if (
    !b ||
    !validHandle(b.handle) ||
    typeof b.list !== 'string' ||
    typeof b.itemId !== 'number' ||
    typeof b.gifter !== 'string' ||
    b.gifter.length < 16 ||
    typeof b.name !== 'string' ||
    !b.name.trim() ||
    (b.action !== 'claim' && b.action !== 'release')
  ) {
    return res.status(400).json({ ok: false, code: 'bad_request', message: 'Malformed dibs request.' });
  }
  try {
    const out = await dibs(b);
    if (out.result === 'expired') return res.status(404).json({ ok: false, code: 'expired', message: 'This list link has expired.', dibs: out.dibs });
    if (out.result === 'taken') return res.status(409).json({ ok: false, code: 'taken', message: 'Someone else just called dibs.', dibs: out.dibs });
    return res.status(200).json({ ok: true, dibs: out.dibs });
  } catch (e) {
    console.error('[dibs]', e);
    return res.status(502).json({ ok: false, code: 'upstream', message: 'Storage error.' });
  }
}
