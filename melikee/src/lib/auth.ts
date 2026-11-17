/** Phone sign-in, app side. See `api/auth.ts`. */
import type { StartResponse, VerifyRequest, VerifyResponse } from './authContract';
import { apiBase } from './match';

async function post<T>(body: unknown): Promise<T> {
  try {
    const res = await fetch(`${apiBase()}/api/auth`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = (await res.json().catch(() => null)) as T | null;
    if (json) return json;
    return { ok: false, code: 'upstream', message: `Sign-in answered ${res.status}.` } as T;
  } catch {
    return { ok: false, code: 'upstream', message: 'Couldn’t reach MeLikee. Check your connection.' } as T;
  }
}

export const sendCode = (phone: string) => post<StartResponse>({ action: 'start', phone });

export const verifyCode = (req: Omit<VerifyRequest, 'action'>) => post<VerifyResponse>({ action: 'verify', ...req });

/** (555) 123-4567 as it's typed. Keeps only the 10 digits after an optional leading 1. */
export function formatPhone(raw: string) {
  let d = raw.replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  d = d.slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

export const phoneDigits = (formatted: string) => formatted.replace(/\D/g, '').slice(-10);
