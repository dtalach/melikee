/**
 * "Working our magic…" — the beat between the snap and the reveal.
 *
 * A lime arc sweeping around the magpie star, with a pink sparkle in orbit.
 * The note underneath is mode-aware, so the wait explains itself: a barcode
 * promises an exact match, a photo promises a search.
 */
import { useEffect, useState } from 'react';
import { View } from 'react-native';

import { magicNote, MAGIC_PATIENCE_MS, MAGIC_PATIENCE_NOTE } from '@/services/productMatch';
import { useCaptureStore } from '@/store/useCaptureStore';
import { SparkleIcon } from '@/ui/icons';
import { Orbit, Spin, Twinkle } from '@/ui/motion';
import { AppText } from '@/ui/primitives';
import { brand } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import type { CaptureMode } from '@/store/types';

export function WorkingOurMagic({ mode }: { mode: CaptureMode }) {
  const theme = useTheme();

  // The eye finishes in about four seconds; the shops take closer to twenty.
  // The moment we know what the thing is, say so — most of this wait is spent
  // on a question that has already been answered.
  const reading = useCaptureStore((s) => s.reading);
  const named = [reading?.brand, reading?.productName].filter(Boolean).join(' ').trim();

  // A scripted match landed in 1.6s. A real one reads a photo and then searches
  // actual shops, which sometimes takes long enough that silence starts to read
  // as "it's broken". After a few seconds the note says what's happening.
  const [patient, setPatient] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setPatient(true), MAGIC_PATIENCE_MS);
    return () => clearTimeout(timer);
  }, []);

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

      <AppText style={{ fontSize: 14, fontWeight: '700' }}>
        {named ? 'Ooh — nice one.' : 'Working our magic…'}
      </AppText>

      {named ? (
        <View style={{ alignItems: 'center', gap: 3, paddingHorizontal: 30 }}>
          <AppText tone="lime" style={{ fontSize: 15, fontWeight: '800', textAlign: 'center' }}>
            {named}
          </AppText>
          <AppText tone="muted" style={{ fontSize: 11, fontWeight: '600' }}>
            checking who’s got it…
          </AppText>
        </View>
      ) : (
        <AppText tone="muted" style={{ fontSize: 11, fontWeight: '600' }}>
          {patient ? MAGIC_PATIENCE_NOTE : magicNote(mode)}
        </AppText>
      )}
    </View>
  );
}
