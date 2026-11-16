/**
 * Getting a photo ready to send. A phone camera hands back ~12 megapixels;
 * uploading that is the slowest part of a capture and Claude gains nothing
 * from it. Scale to a 1568px long edge (large enough to read a model number
 * off a box) and JPEG at 0.7.
 */
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { ImagePayload } from './matchContract';

const LONG_EDGE = 1568;
const QUALITY = 0.7;

export type Prepared = { uri: string; image?: ImagePayload };

/** Never throws: a photo that can't be shrunk is still worth keeping. */
export async function preparePhoto(p: { uri: string; width?: number; height?: number; base64?: string | null }): Promise<Prepared> {
  try {
    const w = p.width || LONG_EDGE;
    const h = p.height || LONG_EDGE;
    const scale = Math.min(1, LONG_EDGE / Math.max(w, h));
    const ctx = ImageManipulator.manipulate(p.uri);
    if (scale < 1) ctx.resize({ width: Math.round(w * scale) });
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY, base64: true });
    if (saved.base64) return { uri: p.uri, image: { data: saved.base64, mediaType: 'image/jpeg' } };
  } catch {
    // Fall back to whatever bytes we already have.
  }
  const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(p.uri);
  if (m) return { uri: p.uri, image: { data: m[2], mediaType: m[1] as ImagePayload['mediaType'] } };
  if (p.base64) return { uri: p.uri, image: { data: p.base64, mediaType: 'image/jpeg' } };
  return { uri: p.uri };
}
