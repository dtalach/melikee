/**
 * "We found it" — the magic moment.
 *
 * The card is dealt in with a spring overshoot (the one place overshoot is
 * allowed), then flies down into the shutter when you claim it, so wishes
 * visibly collect into the button you'll press next time.
 */
import { View } from 'react-native';

import { foundImageLabel, PRICE_FRESHNESS } from '@/services/productMatch';
import { FlyToShutter, PopIn, Twinkle } from '@/ui/motion';
import { AppText, Button, Photo, Squish } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { CaptureMode, ProductMatch } from '@/store/types';

export function FoundCard({
  match,
  mode,
  flying,
  photoUri,
  onWantIt,
  onSeeAlternates,
  onFlightDone,
}: {
  match: ProductMatch;
  mode: CaptureMode;
  flying: boolean;
  photoUri?: string;
  onWantIt: () => void;
  onSeeAlternates: () => void;
  onFlightDone: () => void;
}) {
  const theme = useTheme();

  const card = (
    <View
      style={{
        width: 236,
        backgroundColor: theme.card,
        borderWidth: 2,
        borderColor: theme.violet66,
        borderRadius: layout.radius.bigCard,
        overflow: 'hidden',
        boxShadow: `0 12px 40px rgba(0,0,0,0.5), 0 0 30px rgba(167,139,250,0.25)`,
      }}
    >
      <Twinkle size={14} color={brand.lime} duration={1600} style={{ position: 'absolute', top: 8, right: 10, zIndex: 1 }} />

      <Photo uri={photoUri} label={foundImageLabel(mode)} style={{ height: 110 }} />

      <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 8 }}>
        <AppText style={{ fontSize: 14, fontWeight: '800', lineHeight: 17 }}>{match.name}</AppText>
        <AppText tone="lime" style={{ fontSize: 12, fontWeight: '800' }}>
          {match.price} · {match.stores}
        </AppText>
        {/* Prices drift — never present one as fact. */}
        <AppText tone="muted" style={{ fontSize: 10, fontWeight: '600' }}>
          {PRICE_FRESHNESS}
        </AppText>

        <Button label="Want it!" size="md" onPress={onWantIt} style={{ alignSelf: 'stretch' }} />

        <Squish onPress={onSeeAlternates}>
          <AppText tone="muted" style={{ fontSize: 11, fontWeight: '700', textAlign: 'center' }}>
            not it — see near matches
          </AppText>
        </Squish>
      </View>
    </View>
  );

  const frame = {
    position: 'absolute' as const,
    inset: 0,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  if (flying) {
    return (
      <View style={frame} pointerEvents="none">
        <FlyToShutter onDone={onFlightDone}>{card}</FlyToShutter>
      </View>
    );
  }

  return (
    <View style={frame}>
      <PopIn>{card}</PopIn>
    </View>
  );
}
