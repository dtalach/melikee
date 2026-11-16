import { useEffect, useState } from 'react';
import { Animated, Platform, View } from 'react-native';

import { useApp } from '@/store/useApp';
import { brand, palette } from '@/theme/tokens';
import { Sparkle } from '@/ui/icons';
import { T } from '@/ui/primitives';

const MS = 2400;

/** mlk-toast: rises in, holds, fades — 2.4s. */
export function Toast() {
  const toast = useApp((s) => s.toast);
  const [v] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!toast) return;
    v.setValue(0);
    const native = Platform.OS !== 'web';
    const a = Animated.sequence([
      Animated.timing(v, { toValue: 1, duration: MS * 0.1, useNativeDriver: native }),
      Animated.delay(MS * 0.75),
      Animated.timing(v, { toValue: 2, duration: MS * 0.15, useNativeDriver: native }),
    ]);
    a.start(({ finished }) => {
      if (finished && useApp.getState().toast?.key === toast.key) useApp.setState({ toast: null });
    });
    return () => a.stop();
  }, [toast, v]);

  if (!toast) return null;
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, bottom: 104, alignItems: 'center', zIndex: 7 }}>
      <Animated.View
        accessibilityLiveRegion="polite"
        style={{
          opacity: v.interpolate({ inputRange: [0, 1, 2], outputRange: [0, 1, 0] }),
          transform: [{ translateY: v.interpolate({ inputRange: [0, 1, 2], outputRange: [10, 0, 0] }) }],
          backgroundColor: palette.card,
          borderWidth: 1,
          borderColor: palette.vio44,
          borderRadius: 999,
          paddingVertical: 9,
          paddingHorizontal: 16,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
        }}
      >
        <Sparkle size={13} color={brand.lime} />
        <T size={12.5} w={700}>
          {toast.msg}
        </T>
      </Animated.View>
    </View>
  );
}
