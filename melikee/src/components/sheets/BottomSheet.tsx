import { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SlideUp } from '@/ui/motion';
import { layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

/** The shared chrome for every half-sheet: scrim, grab handle, rounded panel. */
export function BottomSheet({
  children,
  onClose,
}: {
  children: ReactNode;
  onClose: () => void;
}) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ position: 'absolute', inset: 0, zIndex: 8 }}>
      <Pressable
        accessibilityLabel="Close"
        onPress={onClose}
        style={{ flex: 1, backgroundColor: theme.scrim }}
      />
      <SlideUp>
        <View
          style={{
            backgroundColor: theme.card,
            borderWidth: 2,
            borderBottomWidth: 0,
            borderColor: theme.violet66,
            borderTopLeftRadius: layout.radius.sheet,
            borderTopRightRadius: layout.radius.sheet,
            paddingHorizontal: 18,
            paddingTop: 14,
            paddingBottom: Math.max(24, insets.bottom + 10),
            gap: 12,
            boxShadow: `0 -10px 34px ${theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(45,36,71,0.2)'}`,
          }}
        >
          <View
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              backgroundColor: theme.violet55,
              alignSelf: 'center',
            }}
          />
          {children}
        </View>
      </SlideUp>
    </View>
  );
}
