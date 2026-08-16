/**
 * "We know what that is."
 *
 * The old found card was designed as a trophy: the match was scripted, instant
 * and always right, so the card only had to be pretty. Once the lookup became
 * real the same card was doing a different job — it had become the moment you
 * decide whether the app got it right — and a 236px trophy with your own photo
 * on it gives you nothing to decide with.
 *
 * So this is a verdict, not a trophy. It is large, it says the product's name
 * at a size you can read across a room, and underneath it shows **the words it
 * read off the packaging**. That evidence matters more than a catalogue
 * thumbnail: "CHERRY OBITUARY · MURDER YOUR THIRST" proves the app looked at
 * the thing in your hand, where a stock photo only proves it found *a* can.
 *
 * There is no price here on purpose. Knowing what the thing is happens in four
 * seconds; knowing what it costs takes twenty more. The claim is made on the
 * product, and the price catches up on the list afterwards.
 */
import { View, useWindowDimensions } from 'react-native';

import { FlyToShutter, PopIn, Twinkle } from '@/ui/motion';
import { AppText, Button, Photo, Squish } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { ProductReading } from '@/services/recognition/contract';

export function IdentityCard({
  reading,
  photoUri,
  flying,
  onWantIt,
  onNotIt,
  onFlightDone,
}: {
  reading: ProductReading;
  photoUri?: string;
  flying: boolean;
  onWantIt: () => void;
  onNotIt: () => void;
  onFlightDone: () => void;
}) {
  const theme = useTheme();
  const { width } = useWindowDimensions();

  const name = [reading.brand, reading.productName].filter(Boolean).join(' ').trim();

  // What was actually legible on it, minus whatever already appears in the
  // name — repeating "Liquid Death" back at someone proves nothing.
  const evidence = reading.visibleText
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !name.toLowerCase().includes(line.toLowerCase()))
    .slice(0, 4);

  const sure = reading.confidence === 'high';

  const card = (
    <View
      style={{
        width: Math.min(width - 44, 360),
        backgroundColor: theme.card,
        borderWidth: 2,
        borderColor: sure ? theme.lime66 : theme.violet66,
        borderRadius: layout.radius.sheet,
        overflow: 'hidden',
        boxShadow: '0 16px 48px rgba(0,0,0,0.55), 0 0 34px rgba(167,139,250,0.22)',
      }}
    >
      <Twinkle
        size={16}
        color={brand.lime}
        duration={1600}
        style={{ position: 'absolute', top: 10, right: 12, zIndex: 1 }}
      />

      <Photo uri={photoUri} label="your photo" style={{ height: 190 }} />

      <View style={{ paddingHorizontal: 18, paddingVertical: 16, gap: 12 }}>
        <View style={{ gap: 5 }}>
          <AppText
            tone={sure ? 'lime' : 'violet'}
            style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 0.8 }}
          >
            {sure ? 'WE KNOW THIS ONE' : 'OUR BEST READ'}
          </AppText>
          <AppText style={{ fontSize: 21, fontWeight: '800', lineHeight: 25, letterSpacing: -0.4 }}>
            {name || reading.category || 'Something shiny'}
          </AppText>
          {reading.variant ? (
            <AppText tone="soft" style={{ fontSize: 13, fontWeight: '700' }}>
              {reading.variant}
            </AppText>
          ) : null}
        </View>

        {/* The proof. This is the difference between "we guessed a category"
            and "we read your can". */}
        {evidence.length ? (
          <View style={{ gap: 4 }}>
            <AppText tone="muted" style={{ fontSize: 9.5, fontWeight: '800', letterSpacing: 0.7 }}>
              READ OFF IT
            </AppText>
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
                  <AppText tone="soft" style={{ fontSize: 10.5, fontWeight: '700' }}>
                    {line}
                  </AppText>
                </View>
              ))}
            </View>
          </View>
        ) : null}

        <Button label="Want it!" size="lg" onPress={onWantIt} style={{ alignSelf: 'stretch' }} />

        {/* The price is deliberately absent — and saying so beats leaving a
            hole where a number should be. */}
        <AppText tone="muted" style={{ fontSize: 10.5, textAlign: 'center' }}>
          we’ll find the price and where to buy it while you carry on
        </AppText>

        <Squish onPress={onNotIt}>
          <AppText tone="muted" style={{ fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
            not it — take another
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
