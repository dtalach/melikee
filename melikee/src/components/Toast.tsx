import { useEffect } from 'react';
import { View } from 'react-native';

import { AppText } from '@/ui/primitives';
import { SparkleIcon } from '@/ui/icons';
import { SlideUp } from '@/ui/motion';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';

/** How long a toast stays up before it clears itself. */
const TOAST_MS = 2400;

/**
 * The app's one-line confirmations — "Dibs called", "Undone. Never happened."
 * It sits above the dock so it never covers the shutter.
 */
export function Toast() {
  const theme = useTheme();
  const toast = useAppStore((s) => s.toast);
  const clearToast = useAppStore((s) => s.clearToast);
  // The camera screen keeps its mode selector above the dock, so the toast
  // clears that too rather than landing on top of SCAN · SNAP · SAY IT.
  const onCamera = useAppStore((s) => s.activeTab === 'camera');

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(clearToast, TOAST_MS);
    return () => clearTimeout(timer);
  }, [toast, clearToast]);

  if (!toast) return null;

  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 24,
        right: 24,
        bottom: onCamera ? 152 : 96,
        alignItems: 'center',
        zIndex: 7,
      }}
    >
      {/* Keyed so a second toast replays the entrance instead of sitting still. */}
      <SlideUp key={toast}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            backgroundColor: theme.card,
            borderWidth: 1.5,
            borderColor: theme.violet66,
            borderRadius: layout.radius.pill,
            paddingVertical: 9,
            paddingHorizontal: 16,
            boxShadow: `0 8px 24px ${theme.isDark ? 'rgba(0,0,0,0.5)' : 'rgba(45,36,71,0.18)'}`,
          }}
        >
          <SparkleIcon size={13} color={brand.lime} />
          <AppText style={{ fontSize: 12.5, fontWeight: '700' }}>{toast}</AppText>
        </View>
      </SlideUp>
    </View>
  );
}
