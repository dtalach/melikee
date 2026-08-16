/**
 * Near-match recovery.
 *
 * The design review's biggest note: the whole product hinges on "snap → we
 * found it" being right, and the prototype had no design for the miss. Three
 * candidates with their match reasons save most of them — and the fallback
 * below saves the rest, because losing a wish breaks the core promise.
 */
import { View } from 'react-native';

import { RiseIn } from '@/ui/motion';
import { AppText, Photo, Squish } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useCaptureStore } from '@/store/useCaptureStore';

export function NearMatches({ onSaveForLater }: { onSaveForLater: () => void }) {
  const theme = useTheme();
  const candidates = useCaptureStore((s) => s.candidates);
  const chosen = useCaptureStore((s) => s.chosen);
  const chooseAlternate = useCaptureStore((s) => s.chooseAlternate);
  const photoUri = useCaptureStore((s) => s.photoUri);

  return (
    <View
      style={{
        position: 'absolute',
        inset: 0,
        justifyContent: 'center',
        paddingHorizontal: 34,
        gap: 9,
      }}
    >
      <AppText style={{ fontSize: 15, fontWeight: '800', textAlign: 'center', marginBottom: 4 }}>
        Which one is it?
      </AppText>

      {candidates.map((candidate, index) => (
        <RiseIn key={`${candidate.upc}-${index}`} delay={index * 40}>
          <Squish onPress={() => chooseAlternate(index)}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 10,
                backgroundColor: theme.card,
                borderWidth: 2,
                borderColor: index === chosen ? brand.lime : theme.violet44,
                borderRadius: layout.radius.chip,
                paddingHorizontal: 12,
                paddingVertical: 10,
              }}
            >
              {/* Each candidate wears its own face. Showing the user's photo
                  on the first row and grey squares on the rest made the one
                  question this screen exists to answer unanswerable. */}
              <Photo
                uri={candidate.imageUrl ?? (index === 0 ? photoUri : undefined)}
                label=""
                style={{ width: 42, height: 42 }}
                radius={9}
              />
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText style={{ fontSize: 12.5, fontWeight: '800', lineHeight: 16 }}>
                  {candidate.name}
                </AppText>
                <AppText tone="muted" style={{ fontSize: 11 }}>
                  {candidate.reason}
                </AppText>
              </View>
              <AppText tone="lime" style={{ fontSize: 12.5, fontWeight: '800' }}>
                {candidate.price}
              </AppText>
            </View>
          </Squish>
        </RiseIn>
      ))}

      {/* Never lose the wish. */}
      <Squish onPress={onSaveForLater} style={{ paddingVertical: 8 }}>
        <AppText tone="violet" style={{ fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
          None of these — save my photo, keep matching
        </AppText>
      </Squish>
    </View>
  );
}
