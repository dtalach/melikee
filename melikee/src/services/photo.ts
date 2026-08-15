/**
 * Getting a captured photo ready for the recognition service.
 *
 * A phone camera hands back a 12-megapixel file. Uploading that over a shop's
 * wifi is the slowest part of the whole capture, and Claude gains nothing from
 * it — its high-resolution vision tier tops out around a 2576px long edge, and
 * everything above that is resized away before the model ever sees it.
 *
 * So the photo is scaled to a 1568px long edge before it leaves the device.
 * That is small enough to send quickly and still large enough to read a model
 * number off the back of a box, which is the whole job.
 */
import type { CameraCapturedPicture } from 'expo-camera';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import type { RecognizeImage } from '@/services/recognition/contract';

/** The long edge we send. Below Opus 5's high-res ceiling, above legibility. */
const LONG_EDGE = 1568;

/** JPEG quality. Text stays crisp well below 1; the file halves. */
const QUALITY = 0.7;

export type PreparedPhoto = {
  /** What the UI shows — the full-quality capture, untouched. */
  uri?: string;
  /** What the service reads. Absent when the photo could not be prepared. */
  image?: RecognizeImage;
};

/**
 * Never throws. A photo that cannot be shrunk is still a photo worth keeping —
 * the app's fallback is "save it and keep matching", and that needs the URI far
 * more than it needs the bytes.
 */
export async function preparePhoto(photo: CameraCapturedPicture | undefined): Promise<PreparedPhoto> {
  if (!photo?.uri) return {};

  try {
    const scale = Math.min(1, LONG_EDGE / Math.max(photo.width || LONG_EDGE, photo.height || LONG_EDGE));
    const context = ImageManipulator.manipulate(photo.uri);
    if (scale < 1) {
      context.resize({ width: Math.round((photo.width || LONG_EDGE) * scale) });
    }
    const rendered = await context.renderAsync();
    const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: QUALITY, base64: true });
    if (saved.base64) {
      return { uri: photo.uri, image: { data: saved.base64, mediaType: 'image/jpeg' } };
    }
  } catch {
    // Fall through to the data-URI path below.
  }

  // On web there is no file system, so `uri` is already a data URI and the
  // bytes are right there. Worth trying before giving up on the lookup.
  const inline = fromDataUri(photo.uri) ?? (photo.base64 ? { data: photo.base64, mediaType: 'image/jpeg' as const } : undefined);
  return { uri: photo.uri, image: inline };
}

function fromDataUri(uri: string): RecognizeImage | undefined {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(uri);
  if (!match) return undefined;
  return { data: match[2], mediaType: match[1] as RecognizeImage['mediaType'] };
}
