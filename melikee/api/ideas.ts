/**
 * POST /api/ideas — gift inspiration from taste signals. See server/ideas.ts.
 * Like /api/match, it works without signing in, but signed-in (phone-verified)
 * devices get 60 batches a day and anyone else 20 a day per connection. The
 * same signals give the same ideas for six hours.
 */
import type { IdeasRequest } from '../src/lib/ideasContract';
import { allow, isVerified, sha } from '../server/auth';
import { cached, cacheKey } from '../server/cache';
import { cleanSignals, generateIdeas } from '../server/ideas';
import { describeError, isConfigured } from '../server/match';

type Req = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (c: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void; end: () => void };

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'bad_request', message: 'POST only.' });
  if (!isConfigured()) return res.status(503).json({ ok: false, code: 'not_configured', message: 'Ideas aren’t switched on here yet.' });

  let b: IdeasRequest | null = null;
  try {
    b = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as IdeasRequest | null;
  } catch {
    // falls through
  }
  const signals = cleanSignals(b?.signals);
  if (!b || !signals) return res.status(400).json({ ok: false, code: 'bad_request', message: 'Expected { signals }.' });
  const count = Math.max(4, Math.min(12, Number(b.count) || 8));

  try {
    const fwd = req.headers?.['x-forwarded-for'];
    const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() || 'unknown';
    const signedIn = typeof b.secret === 'string' && (await isVerified(b.secret));
    const ok = signedIn ? await allow('ideas', sha(b.secret!), 60, 86400) : await allow('ideasip', ip, 20, 86400);
    if (!ok) return res.status(429).json({ ok: false, code: 'rate_limited', message: 'That’s a lot of ideas for one day. More tomorrow.' });
    const out = await cached(cacheKey('ideas', { signals, count }), 6 * 3600, (v) => v.ideas.length > 0, () => generateIdeas(signals, count));
    return res.status(200).json({ ok: true, ...out });
  } catch (e) {
    const d = describeError(e);
    console.error('[ideas]', d.code, d.message);
    return res.status(502).json({ ok: false, code: 'upstream', message: 'Couldn’t come up with ideas just now. Try again.' });
  }
}
