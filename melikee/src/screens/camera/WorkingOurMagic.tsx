/**
 * "Working our magic…" — the beat between the snap and the reveal.
 *
 * A lime arc sweeping around the magpie star, with a pink sparkle in orbit.
 * The note underneath is mode-aware, so the wait explains itself: a barcode
 * promises an exact match, a photo promises a search.
 */
import { View } from 'react-native';

import { magicNote } from '@/services/productMatch';
import { SparkleIcon } from '@/ui/icons';
import { Orbit, Spin, Twinkle } from '@/ui/motion';
import { AppText } from '@/ui/primitives';
import { brand } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { CaptureMode } from '@/store/types';

export function WorkingOurMagic({ mode }: { mode: CaptureMode }) {
  const theme = useTheme();

  return (
    <View
      style={{
        position: 'absolute',
        inset: 0,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
      }}
      pointerEvents="none"
    >
      <View style={{ width: 96, height: 96, alignItems: 'center', justifyContent: 'center' }}>
        <Spin duration={1000} style={{ position: 'absolute', inset: 0 }}>
          <View
            style={{
              width: 96,
              height: 96,
              borderRadius: 48,
              borderTopWidth: 2,
              borderTopColor: brand.lime,
              borderLeftWidth: 2,
              borderLeftColor: 'transparent',
              borderRightWidth: 2,
              borderRightColor: 'transparent',
              borderBottomWidth: 2,
              borderBottomColor: 'transparent',
            }}
          />
        </Spin>

        <Orbit radius={40} duration={1600}>
          <SparkleIcon size={12} color={brand.pink} />
        </Orbit>

        <Twinkle size={30} color={theme.violet} duration={1200} />
      </View>

      <AppText style={{ fontSize: 14, fontWeight: '700' }}>Working our magic…</AppText>
      <AppText tone="muted" style={{ fontSize: 11, fontWeight: '600' }}>
        {magicNote(mode)}
      </AppText>
    </View>
  );
}
