import { useSafeAreaInsets } from 'react-native-safe-area-context';

/**
 * Top spacing for screen chrome.
 *
 * On a phone this is the real status-bar inset. On web and on devices without
 * one there's no inset at all, and headers end up flush against the top edge —
 * so there's a floor. The design was drawn inside a frame that already had
 * 59px of status bar, so its own offsets stack on top of this.
 */
export function useTopInset(extra = 0) {
  const insets = useSafeAreaInsets();
  return Math.max(insets.top, 14) + extra;
}
