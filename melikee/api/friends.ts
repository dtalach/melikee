/**
 * POST /api/friends — search, requests, friendships, what friends share.
 * Every call carries the device secret; see src/lib/friendsContract.ts.
 */
import type { FriendsRequest } from '../src/lib/friendsContract';
import { accept, accountForSecret, block, end, friendDibs, FriendsError, request, search, setAccess, setFindByPhone, sync } from '../server/friends';
import { isConfigured } from '../server/pages';

type Req = { method?: string; body?: unknown };
type Res = { status: (c: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void; end: () => void };

const STATUS: Record<FriendsError['code'], number> = { signed_out: 401, not_found: 404, not_friends: 403, blocked: 403, taken: 409, rate_limited: 429, bad_request: 400 };

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false, code: 'bad_request', message: 'POST only.' });
  if (!isConfigured()) return res.status(503).json({ ok: false, code: 'not_configured', message: 'Friends need a database on this deployment.' });

  let b: FriendsRequest | null = null;
  try {
    b = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as FriendsRequest | null;
  } catch {
    // falls through to bad_request
  }
  if (!b || typeof b !== 'object' || typeof b.action !== 'string') return res.status(400).json({ ok: false, code: 'bad_request', message: 'Expected { action, secret }.' });

  try {
    const me = await accountForSecret(b.secret);
    if (!me) throw new FriendsError('signed_out', 'Verify your phone to use friends.');
    const uid = 'uid' in b && typeof b.uid === 'string' ? b.uid : '';
    const needUid = () => {
      if (!uid) throw new FriendsError('bad_request', 'Who?');
      return uid;
    };
    switch (b.action) {
      case 'sync':
        return res.status(200).json(await sync(me));
      case 'search':
        if (typeof b.q !== 'string') throw new FriendsError('bad_request', 'Search for a @handle or a phone number.');
        return res.status(200).json({ ok: true, results: await search(me, b.q) });
      case 'request':
        return res.status(200).json({ ok: true, state: await request(me, needUid()) });
      case 'accept':
        return res.status(200).json({ ok: true, state: await accept(me, needUid()) });
      case 'decline':
        return res.status(200).json({ ok: true, state: await end(me, needUid(), 'in') });
      case 'cancel':
        return res.status(200).json({ ok: true, state: await end(me, needUid(), 'out') });
      case 'remove':
        return res.status(200).json({ ok: true, state: await end(me, needUid(), 'friends') });
      case 'block':
        return res.status(200).json({ ok: true, state: await block(me, needUid()) });
      case 'access':
        if (typeof b.list !== 'string' || typeof b.on !== 'boolean') throw new FriendsError('bad_request', 'access needs list and on.');
        await setAccess(me, needUid(), b.list, b.on);
        return res.status(200).json({ ok: true });
      case 'settings':
        if (typeof b.findByPhone !== 'boolean') throw new FriendsError('bad_request', 'settings needs findByPhone.');
        await setFindByPhone(me, b.findByPhone);
        return res.status(200).json({ ok: true });
      case 'dibs':
        if (typeof b.list !== 'string' || typeof b.itemId !== 'number' || typeof b.claim !== 'boolean') throw new FriendsError('bad_request', 'dibs needs list, itemId and claim.');
        return res.status(200).json({ ok: true, dibs: await friendDibs(me, needUid(), b.list, b.itemId, b.claim) });
      default:
        throw new FriendsError('bad_request', 'Unknown action.');
    }
  } catch (e) {
    if (e instanceof FriendsError) return res.status(STATUS[e.code]).json({ ok: false, code: e.code, message: e.message });
    console.error('[friends]', b.action, e);
    return res.status(502).json({ ok: false, code: 'upstream', message: 'Something went wrong. Try again.' });
  }
}
