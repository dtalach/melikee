/**
 * "We found it" — the magic moment.
 *
 * The card is dealt in with a spring overshoot (the one place overshoot is
 * allowed), then flies down into the shutter when you claim it, so wishes
 * visibly collect into the button you'll press next time.
 */
import { View } from 'react-native';

import { foundImageLabel, priceFreshness } from '@/services/productMatch';
import { FlyToShutter, PopIn, Twinkle } from '@/ui/motion';
import { AppText, Button, Photo, Squish } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { CaptureMode, ProductMatch } from '@/store/types';

/** The little label sitting on the bottom edge of each half of the compare. */
function Caption({ children }: { children: string }) {
  const theme = useTheme();
  return (
    <AppText
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        fontSize: 8.5,
        fontWeight: '800',
        letterSpacing: 0.5,
        textAlign: 'center',
        paddingVertical: 2,
        color: theme.text,
        backgroundColor: theme.cardTranslucent,
      }}
    >
      {children}
    </AppText>
  );
}

export function FoundCard({
  match,
  mode,
  flying,
  photoUri,
  checkedAt,
  demo,
  alternates,
  onWantIt,
  onSeeAlternates,
  onFlightDone,
}: {
  match: ProductMatch;
  mode: CaptureMode;
  flying: boolean;
  photoUri?: string;
  checkedAt?: string;
  /** True when the match came from the demo catalogue, not a real lookup. */
  demo: boolean;
  /** How many other candidates there are — no point offering none. */
  alternates: number;
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

      {/* Yours against theirs. A name and a price cannot answer "is this the
          right one?" — only the two pictures side by side can, and that is the
          question being asked at exactly this moment. */}
      {match.imageUrl && photoUri ? (
        <View style={{ flexDirection: 'row', height: 110 }}>
          <View style={{ flex: 1 }}>
            <Photo uri={photoUri} label="yours" style={{ flex: 1 }} />
            <Caption>yours</Caption>
          </View>
          <View style={{ width: 1, backgroundColor: theme.violet44 }} />
          <View style={{ flex: 1 }}>
            <Photo uri={match.imageUrl} label="the match" style={{ flex: 1 }} />
            <Caption>the match</Caption>
          </View>
        </View>
      ) : (
        <Photo
          uri={match.imageUrl ?? photoUri}
          label={foundImageLabel(mode)}
          style={{ height: 110 }}
        />
      )}

      <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 8 }}>
        <AppText style={{ fontSize: 14, fontWeight: '800', lineHeight: 17 }}>{match.name}</AppText>
        <AppText tone="lime" style={{ fontSize: 12, fontWeight: '800' }}>
          {match.price} · {match.stores}
        </AppText>
        {/* Prices drift — never present one as fact. And a demo match says so
            here rather than passing itself off as a real shop price. */}
        <AppText tone="muted" style={{ fontSize: 10, fontWeight: '600' }}>
          {demo ? 'demo match · not a live price' : priceFreshness(checkedAt)}
        </AppText>

        <Button label="Want it!" size="md" onPress={onWantIt} style={{ alignSelf: 'stretch' }} />

        {alternates > 0 ? (
          <Squish onPress={onSeeAlternates}>
            <AppText tone="muted" style={{ fontSize: 11, fontWeight: '700', textAlign: 'center' }}>
              not it — see near matches
            </AppText>
          </Squish>
        ) : null}
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
