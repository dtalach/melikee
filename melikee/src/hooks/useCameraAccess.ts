/**
 * Camera permission, asked for as close to arrival as each platform allows.
 *
 * On iOS and Android the system dialog can be raised whenever we like, so the
 * screen that needs the camera asks as it appears — no button in the way.
 *
 * On the web it cannot. `requestPermission()` is `getUserMedia()` underneath,
 * and Safari only honours that inside a user gesture; called from an effect it
 * is rejected outright, with no prompt ever shown. Worse, expo-camera records
 * that rejection as a flat `DENIED`, so the viewfinder then refuses to render
 * for a browser that would happily have said yes. So on the web the ask rides
 * on a press the person was going to make anyway — "Start snapping", the
 * shutter, or the button on the permission prompt.
 *
 * Where it does auto-ask, it asks exactly once per mount: a dismissed prompt
 * leaves the status undetermined, so an effect reacting to "not granted yet"
 * would prompt in a loop.
 */
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useCameraPermissions } from 'expo-camera';

/** True where the permission can be raised without a press. */
const CAN_ASK_UNPROMPTED = Platform.OS !== 'web';

export function useCameraAccess({ ask }: { ask: boolean } = { ask: true }) {
  const [permission, requestPermission] = useCameraPermissions();
  const asked = useRef(false);

  useEffect(() => {
    if (!CAN_ASK_UNPROMPTED || !ask || asked.current) return;
    // Null while the permission is still being read — not the same as denied.
    if (!permission) return;
    if (permission.granted || !permission.canAskAgain) return;

    asked.current = true;
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
    /** Whether a press is required to raise the dialog on this platform. */
    needsGesture: !CAN_ASK_UNPROMPTED,
  };
}
