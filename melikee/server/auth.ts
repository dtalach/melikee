/**
 * Phone sign-in, server side. A texted 6-digit code via Twilio Verify.
 *
 *   acct:<phoneKey>      { phoneLast2, birth, secretHash, createdAt }
 *   owner:<secretHash>   phoneKey — which verified account a device secret belongs to
 *   owns:<secretHash>    handle — the page that device secret publishes
 *   rl:<scope>:<id>      rate-limit counters
 *
 * Numbers are never stored: `phoneKey` is an HMAC of the E.164 number with a
 * server-only pepper (MELIKEE_PHONE_PEPPER), so the database alone can't be
 * turned back into phone numbers.
 *
 * MeLikee is 13+ only: a new account needs a birthday at least 13 years ago.
 */
import { createHash, createHmac, randomBytes } from 'node:crypto';

import { getStore } from './pages';

export type Birth = { year: number; month: number; day: number };
type Account = { phoneLast2: string; birth: Birth; secretHash: string; createdAt: number };

export const sha = (s: string) => createHash('sha256').update(s).digest('hex');

/**
 * Twilio credentials: an API key (TWILIO_API_KEY_SID + TWILIO_API_KEY_SECRET,
 * preferred: revocable on its own) or the account's Auth Token
 * (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN).
 */
function twilioAuth(): string | null {
  const e = process.env;
  if (e.TWILIO_API_KEY_SID && e.TWILIO_API_KEY_SECRET) return `${e.TWILIO_API_KEY_SID}:${e.TWILIO_API_KEY_SECRET}`;
  if (e.TWILIO_ACCOUNT_SID && e.TWILIO_AUTH_TOKEN) return `${e.TWILIO_ACCOUNT_SID}:${e.TWILIO_AUTH_TOKEN}`;
  return null;
}

export function smsConfigured() {
  return process.env.MELIKEE_SMS === 'fake' || Boolean(twilioAuth() && process.env.TWILIO_VERIFY_SERVICE_SID);
}

function phoneKey(e164: string) {
  const pepper = process.env.MELIKEE_PHONE_PEPPER;
  if (!pepper) throw new Error('MELIKEE_PHONE_PEPPER is not set');
  return createHmac('sha256', pepper).update(e164).digest('hex');
}

/** US/Canada only for now: a smaller target for SMS-pumping fraud. Returns +1XXXXXXXXXX or null. */
export function normalizePhone(raw: string): string | null {
  const d = raw.replace(/\D/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  // NANP: area code and exchange can't start with 0 or 1.
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(ten)) return null;
  return `+1${ten}`;
}

export function ageOn(b: Birth, now = new Date()) {
  const had = now.getMonth() + 1 > b.month || (now.getMonth() + 1 === b.month && now.getDate() >= b.day);
  return now.getFullYear() - b.year - (had ? 0 : 1);
}

// ── rate limits ────────────────────────────────────────────────────────────

/** Fixed-window counter. True while under `max` per `windowSec`. */
export async function allow(scope: string, id: string, max: number, windowSec: number) {
  const s = getStore();
  const key = `rl:${scope}:${sha(id).slice(0, 32)}`;
  const n = await s.incr(key, windowSec);
  return n <= max;
}

// ── Twilio Verify ──────────────────────────────────────────────────────────

async function twilio(path: string, form: Record<string, string>) {
  const auth = Buffer.from(twilioAuth()!).toString('base64');
  const res = await fetch(`https://verify.twilio.com/v2/Services/${process.env.TWILIO_VERIFY_SERVICE_SID}/${path}`, {
    method: 'POST',
    headers: { Authorization: `Basic ${auth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(form),
  });
  const json = (await res.json().catch(() => ({}))) as { status?: string; code?: number; message?: string };
  return { http: res.status, ...json };
}

/** Text a code. Fake mode (local tests only) sends nothing; the code is 000000. */
export async function sendCode(e164: string): Promise<'sent' | 'invalid' | 'failed'> {
  if (process.env.MELIKEE_SMS === 'fake') return 'sent';
  const r = await twilio('Verifications', { To: e164, Channel: 'sms' });
  if (r.http === 201 || r.status === 'pending') return 'sent';
  console.error('[auth] send failed', r.http, r.code, r.message);
  // 60200: invalid parameter (bad number); 60205: SMS not supported (landline).
  return r.code === 60200 || r.code === 60205 ? 'invalid' : 'failed';
}

export async function checkCode(e164: string, code: string): Promise<boolean> {
  if (process.env.MELIKEE_SMS === 'fake') return code === '000000';
  const r = await twilio('VerificationCheck', { To: e164, Code: code });
  return r.http === 200 && r.status === 'approved';
}

// ── accounts ───────────────────────────────────────────────────────────────

export type VerifyResult =
  | { kind: 'created'; secret: string }
  | { kind: 'restored'; secret: string; handle: string | null }
  | { kind: 'needs_birthday' }
  | { kind: 'too_young' };

/**
 * After a correct code: sign in to the existing account for this number, or
 * create one. Either way the device gets a fresh secret; on an existing
 * account that signs out the previous device (its secret stops working).
 * A device that already has a page keeps it: its old secret's page moves to
 * the new secret.
 */
export async function signIn(e164: string, opts: { birth?: Birth; deviceSecret?: string }): Promise<VerifyResult> {
  const s = getStore();
  const key = phoneKey(e164);
  const existing = await s.get<Account>(`acct:${key}`);
  const secret = randomBytes(24).toString('base64url');
  const secretHash = sha(secret);

  if (!existing) {
    if (!opts.birth) return { kind: 'needs_birthday' };
    if (ageOn(opts.birth) < 13) return { kind: 'too_young' };
    await s.set(`acct:${key}`, { phoneLast2: e164.slice(-2), birth: opts.birth, secretHash, createdAt: Date.now() } satisfies Account);
    await s.set(`owner:${secretHash}`, key);
    // A device that published before signing up keeps its page.
    if (opts.deviceSecret) await movePage(sha(opts.deviceSecret), secretHash);
    return { kind: 'created', secret };
  }

  // Existing account: retire the old secret, hand its page to the new one.
  await s.del(`owner:${existing.secretHash}`);
  const handle = await movePage(existing.secretHash, secretHash);
  await s.set(`acct:${key}`, { ...existing, secretHash } satisfies Account);
  await s.set(`owner:${secretHash}`, key);
  return { kind: 'restored', secret, handle };
}

/** Re-points a page from one device secret to another. Returns its handle. */
async function movePage(fromHash: string, toHash: string): Promise<string | null> {
  const s = getStore();
  const handle = await s.get<string>(`owns:${fromHash}`);
  if (!handle) return null;
  const page = await s.get<{ owner: string }>(`page:${handle}`);
  if (page && page.owner === fromHash) await s.set(`page:${handle}`, { ...page, owner: toHash });
  await s.del(`owns:${fromHash}`);
  await s.set(`owns:${toHash}`, handle);
  return handle;
}

/** Is this device secret a signed-in account? */
export async function isVerified(secret: string) {
  return !!(await getStore().get<string>(`owner:${sha(secret)}`));
}
