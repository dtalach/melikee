/**
 * /api/pages — shared lists.
 *
 *   GET  ?handle=&list=&t=&gifter=   a public page, as gifters see it
 *   GET  ?check=<handle>&secret=     is this handle taken by someone else?
 *   PUT  PublishRequest              the owner's device publishes its shared lists
 */
import type { PublishRequest } from '../src/lib/pagesContract';
import { isVerified } from '../server/auth';
import { indexAccount } from '../server/friends';
import { cleanLists, isConfigured, isTaken, publish, readPage, validHandle } from '../server/pages';

type Req = { method?: string; body?: unknown; query?: Record<string, string | string[] | undefined> };
type Res = { status: (c: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void; end: () => void };

const q = (req: Req, k: string) => {
  const v = req.query?.[k];
  return typeof v === 'string' ? v : undefined;
};

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (!isConfigured()) return res.status(503).json({ ok: false, code: 'not_configured', message: 'Shared lists need a database on this deployment.' });

  try {
    if (req.method === 'GET') {
      const check = q(req, 'check');
      if (check != null) {
        if (!validHandle(check)) return res.status(400).json({ ok: false, code: 'bad_request', message: 'Not a valid handle.' });
        return res.status(200).json({ ok: true, taken: await isTaken(check, q(req, 'secret')) });
      }
      const handle = q(req, 'handle')?.toLowerCase();
      if (!validHandle(handle)) return res.status(404).json({ ok: false, code: 'expired', message: 'This list link has expired.' });
      const page = await readPage(handle, q(req, 'list'), q(req, 't'), q(req, 'gifter'));
      return res.status(page.ok ? 200 : 404).json(page);
    }

    if (req.method === 'PUT') {
      const b = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as PublishRequest | null;
      if (!b || !validHandle(b.handle) || typeof b.secret !== 'string' || b.secret.length < 16 || !b.profile || typeof b.profile.name !== 'string' || cleanLists(b.lists) == null) {
        return res.status(400).json({ ok: false, code: 'bad_request', message: 'Malformed publish request.' });
      }
      // Only signed-in (phone-verified) devices can put a page online.
      if (!(await isVerified(b.secret))) return res.status(401).json({ ok: false, code: 'signed_out', message: 'Verify your phone to share your lists.' });
      const out = await publish(b);
      if (out === 'taken') return res.status(409).json({ ok: false, code: 'taken', message: `@${b.handle} is taken.` });
      // Keep the account findable by its current handle and name.
      await indexAccount(b.secret, b.handle, b.profile.name).catch((e) => console.error('[pages] index', e));
      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ ok: false, code: 'bad_request', message: 'GET or PUT.' });
  } catch (e) {
    console.error('[pages]', e);
    return res.status(502).json({ ok: false, code: 'upstream', message: 'Storage error.' });
  }
}
