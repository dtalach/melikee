/**
 * "Got it."
 *
 * This card asks nothing. The shutter press was the claim, the shiny is
 * already filed, and this is the receipt — it shows what was caught, holds
 * long enough to read, then flies into the shutter.
 *
 * It went the long way round to get here. As a scripted prototype it was a
 * trophy: small, pretty, never wrong. A real lookup quietly turned it into a
 * verdict, and a 236px trophy showing your own photo is a terrible verdict —
 * which is exactly how it tested in a shop. Rather than grow it into a proper
 * decision screen, the decision moved off it entirely. So it is a trophy
 * again, and small is right for a trophy.
 *
 * What it does carry is proof: for a photo, the words read off the packaging.
 * "CHERRY OBITUARY · MURDER YOUR THIRST" shows the app read the thing in your
 * hand, where a catalogue thumbnail would only show it found *a* can.
 */
import { View, useWindowDimensions } from 'react-native';

import { FlyToShutter, PopIn, Twinkle } from '@/ui/motion';
import { AppText, Photo } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { ProductReading } from '@/services/recognition/contract';

export function CaughtCard({
  title,
  note,
  reading,
  photoUri,
  flying,
  onFlightDone,
}: {
  title: string;
  note?: string;
  /** Present for photo captures — the source of the evidence chips. */
  reading?: ProductReading;
  photoUri?: string;
  flying: boolean;
  onFlightDone: () => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  // What was legible on it, minus whatever the title already says — repeating
  // "Liquid Death" back at someone proves nothing.
  const evidence = (reading?.visibleText ?? [])
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !title.toLowerCase().includes(line.toLowerCase()))
    .slice(0, 3);

  const card = (
    <View
      style={{
        width: Math.min(width - 56, 320),
        backgroundColor: theme.card,
        borderWidth: 2,
        borderColor: theme.lime66,
        borderRadius: layout.radius.bigCard,
        overflow: 'hidden',
        boxShadow: '0 14px 44px rgba(0,0,0,0.5), 0 0 30px rgba(200,245,66,0.22)',
      }}
    >
      <Twinkle
        size={15}
        color={brand.lime}
        duration={1400}
        style={{ position: 'absolute', top: 9, right: 11, zIndex: 1 }}
      />

      {photoUri ? <Photo uri={photoUri} label="your photo" style={{ height: 132 }} /> : null}

      <View style={{ paddingHorizontal: 16, paddingVertical: 14, gap: 8 }}>
        <AppText tone="lime" style={{ fontSize: 10, fontWeight: '800', letterSpacing: 0.8 }}>
          CAUGHT IT
        </AppText>
        <AppText style={{ fontSize: 18, fontWeight: '800', lineHeight: 22, letterSpacing: -0.3 }}>
          {title}
        </AppText>
        {note ? (
          <AppText tone="soft" style={{ fontSize: 12.5, fontWeight: '700', marginTop: -4 }}>
            {note}
          </AppText>
        ) : null}

        {evidence.length ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
            {evidence.map((line) => (
              <View
                key={line}
                style={{
                  backgroundColor: theme.inset,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <AppText tone="muted" style={{ fontSize: 10, fontWeight: '700' }}>
                  {line}
                </AppText>
              </View>
            ))}
          </View>
        ) : null}

        {/* Said out loud, because a card with no price on it otherwise reads
            as one that failed to find a price. */}
        <AppText tone="muted" style={{ fontSize: 10.5 }}>
          on your list — price and shops coming
        </AppText>
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
    <View style={frame} pointerEvents="none">
      <PopIn>{card}</PopIn>
    </View>
  );
}
