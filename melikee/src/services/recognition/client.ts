/**
 * The app's half of the recognition contract.
 *
 * Where the endpoint lives depends on how the app is running:
 *
 * - On the web build it is the same origin, so a relative path is enough and
 *   nothing needs configuring.
 * - On a device there is no origin, so `EXPO_PUBLIC_MELIKEE_API` has to name
 *   the deployment. `EXPO_PUBLIC_` is the only prefix Expo inlines into the
 *   bundle, and a base URL is a safe thing to inline — the API key is not, and
 *   never appears on this side of the wire.
 */
import { Platform } from 'react-native';

import { RECOGNIZE_PATH, type RecognizeRequest, type RecognizeResponse } from '@/services/recognition/contract';

/**
 * Must outlast the server, or the app reports a failure for a request that was
 * still running — which is exactly what happened on the first real capture: the
 * function was allowed 60 seconds and the app gave up at 55.
 */
const TIMEOUT_MS = 70_000;

const base = (process.env.EXPO_PUBLIC_MELIKEE_API ?? '').replace(/\/+$/, '');

/** Null when there is nowhere to ask — a device build with nothing configured. */
export const recognizeUrl: string | null = base
  ? `${base}${RECOGNIZE_PATH}`
  : Platform.OS === 'web'
    ? RECOGNIZE_PATH
    : null;

export const hasRecognitionService = recognizeUrl !== null;

export async function callRecognize(request: RecognizeRequest): Promise<RecognizeResponse> {
  if (!recognizeUrl) {
    return { ok: false, code: 'not_configured', message: 'No recognition service is configured.' };
  }

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), TIMEOUT_MS);

  try {
    const response = await fetch(recognizeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: abort.signal,
    });

    // A missing endpoint answers with the app's own HTML, courtesy of the
    // single-page rewrite. Treat anything unparseable as "not deployed".
    const text = await response.text();
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      return { ok: false, code: 'not_configured', message: 'The recognition endpoint is not deployed.' };
    }

    if (isResponse(parsed)) return parsed;
    // Something answered, in JSON, but not with our contract — a platform error
    // page, most often a timeout. Carry what it actually said: this is the
    // difference between "check your signal" and a one-line fix.
    return {
      ok: false,
      code: 'upstream',
      message: `Endpoint returned ${response.status}: ${text.slice(0, 200)}`,
    };
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      ok: false,
      code: 'upstream',
      message: aborted ? 'The lookup took too long.' : 'Could not reach the recognition service.',
    };
  } finally {
    clearTimeout(timer);
  }
}

function isResponse(value: unknown): value is RecognizeResponse {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (v.ok === true) return Array.isArray(v.candidates);
  return v.ok === false && typeof v.code === 'string';
}
