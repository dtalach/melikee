/**
 * POST /api/auth — phone sign-in with a texted code.
 *
 *   { action: 'start', phone }                      texts a 6-digit code
 *   { action: 'verify', phone, code, birth?, ... }  signs in or creates the account
 *
 * Limits: a number gets 3 codes per 10 minutes and 10 per day; a connection
 * gets 10 codes per hour; a number gets 10 wrong guesses per hour.
 */
import type { StartRequest, VerifyRequest } from '../src/lib/authContract';
import { allow, checkCode, normalizePhone, sendCode, signIn, smsConfigured } from '../server/auth';
import { isConfigured as storeConfigured, ownPage } from '../server/pages';

type Req = { method?: string; body?: unknown; headers?: Record<string, string | string[] | undefined> };
type Res = { status: (c: number) => Res; json: (b: unknown) => void; setHeader: (k: string, v: string) => void; end: () => void };

const fail = (res: Res, status: number, code: string, message: string) => res.status(status).json({ ok: false, code, message });

export default async function handler(req: Req, res: Res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return fail(res, 405, 'bad_request', 'POST.');
  if (!smsConfigured() || !storeConfigured() || !process.env.MELIKEE_PHONE_PEPPER) {
    return fail(res, 503, 'not_configured', 'Phone sign-in isn’t switched on yet.');
  }

  const b = (typeof req.body === 'string' ? JSON.parse(req.body) : req.body) as StartRequest | VerifyRequest | null;
  const phone = b && typeof b.phone === 'string' ? normalizePhone(b.phone) : null;
  if (!b || !phone) return fail(res, 400, 'bad_phone', 'Enter a US or Canadian mobile number.');
  const fwd = req.headers?.['x-forwarded-for'];
  const ip = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(',')[0]?.trim() || 'unknown';

  try {
    if (b.action === 'start') {
      if (!(await allow('send10m', phone, 3, 600)) || !(await allow('sendday', phone, 10, 86400)) || !(await allow('sendip', ip, 10, 3600))) {
        return fail(res, 429, 'rate_limited', 'Too many codes. Wait a few minutes and try again.');
      }
      const sent = await sendCode(phone);
      if (sent === 'invalid') return fail(res, 400, 'bad_phone', 'That number can’t get texts. Use a mobile number.');
      if (sent === 'failed') return fail(res, 502, 'send_failed', 'Couldn’t send the text. Try again in a minute.');
      return res.status(200).json({ ok: true, phoneLast2: phone.slice(-2) });
    }

    if (b.action === 'verify') {
      if (typeof b.code !== 'string' || !/^\d{6}$/.test(b.code)) return fail(res, 400, 'bad_code', 'Enter the 6-digit code.');
      if (!(await allow('guess', phone, 10, 3600))) return fail(res, 429, 'rate_limited', 'Too many tries. Wait a bit, then get a new code.');
      if (!(await checkCode(phone, b.code))) return fail(res, 400, 'bad_code', 'That code didn’t work. Check it, or get a new one.');

      const birth = b.birth && [b.birth.year, b.birth.month, b.birth.day].every((n) => Number.isInteger(n)) ? b.birth : undefined;
      const out = await signIn(phone, { birth, deviceSecret: typeof b.deviceSecret === 'string' ? b.deviceSecret : undefined });
      if (out.kind === 'too_young') return fail(res, 403, 'too_young', 'MeLikee is for people 13 and up.');
      if (out.kind === 'needs_birthday') return fail(res, 404, 'needs_birthday', 'No account for that number yet. Sign up first.');
      const page = out.kind === 'restored' && out.handle ? await ownPage(out.handle, out.secret) : null;
      return res.status(200).json({ ok: true, kind: out.kind, secret: out.secret, phoneLast2: phone.slice(-2), handle: out.kind === 'restored' ? out.handle : undefined, page });
    }

    return fail(res, 400, 'bad_request', 'action must be start or verify.');
  } catch (e) {
    console.error('[auth]', e);
    return fail(res, 502, 'upstream', 'Something went wrong. Try again.');
  }
}
