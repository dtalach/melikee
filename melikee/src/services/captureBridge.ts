/**
 * The dock's shutter and the camera screen live in different subtrees, so the
 * camera registers what "fire" means while it's on screen and the dock calls
 * it. Anywhere else, the dock falls back to navigating to the camera.
 */
let handler: (() => void) | null = null;

export function setShutterHandler(next: (() => void) | null) {
  handler = next;
}

/** Returns true if a camera was mounted and took the press. */
export function fireShutter(): boolean {
  if (!handler) return false;
  handler();
  return true;
}
