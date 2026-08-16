/**
 * The miss.
 *
 * A scripted matcher never needed this screen. A real one does: sometimes the
 * frame holds a wall, sometimes the product isn't sold anywhere online, and
 * sometimes the shops just don't answer. The design review's rule still holds —
 * losing the wish is the failure that matters — so every path out of here keeps
 * it: try the same lookup again, keep the photo and match it later, or step
 * back to the viewfinder.
 */
import { View } from 'react-native';

import { missCopy, needsAnotherPhoto, showsDetail } from '@/services/productMatch';
import { RiseIn } from '@/ui/motion';
import { AppText, Button, Photo, Squish } from '@/ui/primitives';
import { layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { CaptureMode } from '@/store/types';
import type { RecognizeErrorCode } from '@/services/recognition/contract';

export function MissCard({
  code,
  mode,
  detail,
  photoUri,
  onRetry,
  onSaveForLater,
  onDismiss,
}: {
  code: RecognizeErrorCode;
  mode: CaptureMode;
  /** What actually went wrong, when it was a fault rather than a miss. */
  detail?: string;
  photoUri?: string;
  onRetry: () => void;
  onSaveForLater: () => void;
  onDismiss: () => void;
}) {
  const theme = useTheme();
  const copy = missCopy(code, mode);

  // When the photo is the problem, running the same lookup again can only
  // reach the same answer — so the button goes back to the viewfinder instead,
  // and says so. Anything else is worth another attempt as-is.
  const reframe = needsAnotherPhoto(code);

  return (
    <View style={{ position: 'absolute', inset: 0, justifyContent: 'center', paddingHorizontal: 34 }}>
      <RiseIn>
        <View
          style={{
            backgroundColor: theme.card,
            borderWidth: 2,
            borderColor: theme.violet44,
            borderRadius: layout.radius.bigCard,
            padding: 16,
            gap: 12,
            alignItems: 'center',
          }}
        >
          {photoUri ? <Photo uri={photoUri} style={{ height: 110, width: '100%' }} /> : null}

          <View style={{ gap: 4, alignItems: 'center' }}>
            <AppText style={{ fontSize: 16, fontWeight: '800', textAlign: 'center' }}>
              {copy.title}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 12, textAlign: 'center', lineHeight: 17 }}>
              {copy.note}
            </AppText>
            {/* When the app broke rather than merely failed to find something,
                say what broke. "Check your signal" is a lie if the signal was
                fine, and the real sentence is the whole of the bug report. */}
            {showsDetail(code) && detail ? (
              <AppText
                tone="muted"
                numberOfLines={4}
                style={{
                  // Stretch, or a long unbroken error string spills past both
                  // edges of the card under `alignItems: center`.
                  alignSelf: 'stretch',
                  fontSize: 9.5,
                  textAlign: 'center',
                  lineHeight: 13,
                  opacity: 0.75,
                }}
              >
                {detail}
              </AppText>
            ) : null}
          </View>

          <Button
            label={reframe ? 'Take another' : 'Try again'}
            size="md"
            onPress={reframe ? onDismiss : onRetry}
          />

          {/* Never lose the wish — the same promise the near-match sheet makes. */}
          {photoUri ? (
            <Squish onPress={onSaveForLater} style={{ paddingVertical: 2 }}>
              <AppText tone="violet" style={{ fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                Save my photo, keep matching
              </AppText>
            </Squish>
          ) : null}

          <Squish onPress={onDismiss} style={{ paddingVertical: 2 }}>
            <AppText tone="muted" style={{ fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
              {reframe ? 'Not now' : 'Back to the camera'}
            </AppText>
          </Squish>
        </View>
      </RiseIn>
    </View>
  );
}
