/**
 * Camera permission, asked for rather than waited for.
 *
 * The app opens shooting — a viewfinder that isn't running is the app not
 * working. So the first screen that needs the camera asks for it on arrival
 * instead of putting a button in the way, and the explanation sits on screen
 * while the system dialog is up rather than in front of it.
 *
 * Asked exactly once per mount, deliberately. On the web a dismissed prompt
 * leaves the status undetermined and `canAskAgain` true, so an effect that
 * simply reacted to "not granted yet" would re-prompt forever. On iOS and
 * Android the system dialog only ever appears once, and a second call after a
 * denial returns immediately with no dialog at all — which is why the copy has
 * to have a separate thing to say once `canAskAgain` goes false.
 */
import { useEffect, useRef } from 'react';
import { useCameraPermissions } from 'expo-camera';

export function useCameraAccess({ ask }: { ask: boolean } = { ask: true }) {
  const [permission, requestPermission] = useCameraPermissions();
  const asked = useRef(false);

  useEffect(() => {
    if (!ask || asked.current) return;
    // Null while the permission is still being read — not the same as denied.
    if (!permission) return;
    if (permission.granted || !permission.canAskAgain) return;

    asked.current = true;
    // A browser with no camera at all rejects rather than answering. That is a
    // "no", not a crash — the screen already knows what to say about it.
    requestPermission().catch(() => undefined);
  }, [ask, permission, requestPermission]);

  return {
    permission,
    requestPermission,
    granted: permission?.granted ?? false,
    /** False once the system will no longer show a dialog — Settings only. */
    canAsk: permission?.canAskAgain ?? true,
    /** True before we know either way, so nothing flashes "denied" on load. */
    pending: !permission,
  };
}
