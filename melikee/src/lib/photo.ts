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

/** Your own shot, kept on the shiny when the store has no photo: small enough to persist. */
const THUMB_EDGE = 360;
const THUMB_QUALITY = 0.6;

export type Prepared = { uri: string; image?: ImagePayload; thumb?: string };

/** A small JPEG data URI of the photo. Never throws. */
async function thumbnail(uri: string, w: number, h: number): Promise<string | undefined> {
  try {
    const ctx = ImageManipulator.manipulate(uri);
    if (w >= h) ctx.resize({ width: Math.min(THUMB_EDGE, w) });
    else ctx.resize({ height: Math.min(THUMB_EDGE, h) });
    const rendered = await ctx.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: THUMB_QUALITY, base64: true });
    return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : undefined;
  } catch {
    return undefined;
  }
}

/** Never throws: a photo that can't be shrunk is still worth keeping. */
export async function preparePhoto(p: { uri: string; width?: number; height?: number; base64?: string | null }): Promise<Prepared> {
  const thumb = await thumbnail(p.uri, p.width || LONG_EDGE, p.height || LONG_EDGE);
  return { ...(await forMatching(p)), thumb };
}

async function forMatching(p: { uri: string; width?: number; height?: number; base64?: string | null }): Promise<Prepared> {
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
