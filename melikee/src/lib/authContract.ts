/** Wire contract for POST /api/auth (phone sign-in). Types only. */
import type { PublicList } from './pagesContract';
import type { Sizes } from './sizes';

export type StartRequest = { action: 'start'; phone: string };
export type VerifyRequest = {
  action: 'verify';
  phone: string;
  code: string;
  /** Needed only for a new account (13+ check). Month is 1–12. */
  birth?: { year: number; month: number; day: number };
  /** This device's current secret, so a page it already published carries over. */
  deviceSecret?: string;
};

export type AuthError = { ok: false; code: 'not_configured' | 'bad_phone' | 'bad_code' | 'rate_limited' | 'too_young' | 'needs_birthday' | 'send_failed' | 'bad_request' | 'upstream'; message: string };

/** `codeLength`: digits in the texted code (4–10), when Twilio says; null otherwise. */
export type StartResponse = { ok: true; phoneLast2: string; codeLength?: number | null } | AuthError;

export type VerifyResponse =
  | {
      ok: true;
      kind: 'created' | 'restored';
      /** The device's new secret: it now owns the account's page. */
      secret: string;
      phoneLast2: string;
      /** On a restore: the account's handle and the lists it had shared. */
      handle?: string | null;
      /** On a restore: the birthday the account signed up with (month 1–12). */
      birth?: { year: number; month: number; day: number };
      page?: { name: string; sizes?: Sizes; lists: PublicList[] } | null;
    }
  | AuthError;
