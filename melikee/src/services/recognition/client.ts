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
 *
 * The endpoint answers two different shapes — a reading, or a list of
 * candidates — so the transport is separated from the shape-checking. They were
 * one function once, validating every reply against the candidates shape, which
 * meant a perfectly good reading was rejected as gibberish and every photo
 * capture failed. Each caller now checks for the answer it actually asked for.
 */
import { Platform } from 'react-native';

import {
  RECOGNIZE_PATH,
  type ReadResponse,
  type RecognizeRequest,
  type RecognizeResponse,
} from '@/services/recognition/contract';

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

/** A failure that happened before any answer arrived, or instead of one. */
type Transport = { ok: false; code: 'not_configured' | 'upstream'; message: string };

/** The identity pass, whichever way the capture came in. */
export async function callRead(
  request: Extract<RecognizeRequest, { mode: 'read' | 'identify-scan' | 'identify-say' }>,
): Promise<ReadResponse> {
  const result = await post(request);
  if ('failed' in result) return result.failed;

  const body = result.body as Record<string, unknown>;
  if (body.ok === true && isReading(body.reading)) {
    return { ok: true, reading: body.reading, timing: body.timing as ReadResponse['timing'] };
  }
  if (body.ok === false && typeof body.code === 'string') return body as ReadResponse;
  return unexpected(result.status, result.text);
}

/** The full pipeline, or the search half of it. */
export async function callRecognize(request: RecognizeRequest): Promise<RecognizeResponse> {
  const result = await post(request);
  if ('failed' in result) return result.failed;

  const body = result.body as Record<string, unknown>;
  if (body.ok === true && Array.isArray(body.candidates)) return body as RecognizeResponse;
  if (body.ok === false && typeof body.code === 'string') return body as RecognizeResponse;
  return unexpected(result.status, result.text);
}

/** Everything both calls share: the request, the timeout, and JSON or not. */
async function post(
  request: RecognizeRequest,
): Promise<{ body: unknown; status: number; text: string } | { failed: Transport }> {
  if (!recognizeUrl) {
    return {
      failed: { ok: false, code: 'not_configured', message: 'No recognition service is configured.' },
    };
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
    try {
      return { body: JSON.parse(text), status: response.status, text };
    } catch {
      return {
        failed: {
          ok: false,
          code: 'not_configured',
          message: 'The recognition endpoint is not deployed.',
        },
      };
    }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError';
    return {
      failed: {
        ok: false,
        code: 'upstream',
        message: aborted ? 'The lookup took too long.' : 'Could not reach the recognition service.',
      },
    };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * JSON arrived, but not ours — a platform error page, most often a timeout.
 * Carrying what it actually said is the difference between "check your signal"
 * and a one-line fix.
 */
function unexpected(status: number, text: string): Transport {
  return { ok: false, code: 'upstream', message: `Endpoint returned ${status}: ${text.slice(0, 200)}` };
}

function isReading(value: unknown): value is NonNullable<Extract<ReadResponse, { ok: true }>['reading']> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return typeof v.searchQuery === 'string' && Array.isArray(v.visibleText);
}
