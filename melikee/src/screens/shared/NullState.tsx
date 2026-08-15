/**
 * The full-bleed null state.
 *
 * An outlined box in the middle of an empty screen read as "widget in a void".
 * The app already has a vocabulary for big moments — the camera screen's glow
 * ground, floating sparkles and open content — so empty screens borrow it: no
 * box at all, and the orb wears its own tab's icon so the screen self-identifies.
 */
import { type ReactNode } from 'react';
import { View } from 'react-native';

import { Breathe, Twinkle } from '@/ui/motion';
import { AppText, Button, GlowGround } from '@/ui/primitives';
import { brand } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

export type NullStateStep = { tone: 'lime' | 'pink' | 'violet'; title: string; body: string };

export function NullState({
  icon,
  headline,
  body,
  cta,
  onPress,
  steps,
  footnote,
  /** Feed keeps its null state top-anchored because Trending fills below it. */
  anchor = 'center',
}: {
  icon: ReactNode;
  headline: string;
  body?: string;
  cta: string;
  onPress: () => void;
  steps?: NullStateStep[];
  footnote?: string;
  anchor?: 'top' | 'center';
}) {
  const theme = useTheme();
  const orbSize = anchor === 'center' ? 78 : 64;

  return (
    <GlowGround
      center={anchor === 'center' ? 0.12 : 0}
      spread={{ x: 0.6, y: anchor === 'center' ? 0.4 : 0.5 }}
      style={{
        flex: anchor === 'center' ? 1 : undefined,
        justifyContent: 'center',
        alignItems: 'center',
        gap: anchor === 'center' ? 16 : 14,
        paddingHorizontal: 34,
        paddingVertical: anchor === 'center' ? 40 : 32,
      }}
    >
      <Twinkle size={14} color={brand.lime} duration={2200} style={{ position: 'absolute', top: 30, left: 44 }} />
      <Twinkle size={10} color={brand.pink} duration={2800} delay={600} style={{ position: 'absolute', top: 72, right: 52 }} />
      <Twinkle size={9} color={theme.violet} duration={3100} delay={1200} style={{ position: 'absolute', bottom: 40, left: 66 }} />

      <Breathe>
        <View
          style={{
            width: orbSize,
            height: orbSize,
            borderRadius: orbSize / 2,
            borderWidth: 1,
            borderColor: theme.violet,
            backgroundColor: theme.violetFill,
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: `0 0 ${anchor === 'center' ? 38 : 32}px ${brand.violetGlowSoft}`,
          }}
        >
          {icon}
        </View>
      </Breathe>

      <AppText
        glow
        style={{
          fontSize: anchor === 'center' ? 22 : 20,
          fontWeight: '800',
          letterSpacing: -0.44,
          textAlign: 'center',
          lineHeight: anchor === 'center' ? 28 : 26,
        }}
      >
        {headline}
      </AppText>

      {body ? (
        <AppText tone="muted" style={{ fontSize: 12, textAlign: 'center', maxWidth: 250, lineHeight: 18 }}>
          {body}
        </AppText>
      ) : null}

      {/* Each step sells a benefit, not a mechanic. */}
      {steps ? (
        <View style={{ gap: 10, maxWidth: 270 }}>
          {steps.map((step, index) => (
            <View key={step.title} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
              <View
                style={{
                  minWidth: 20,
                  height: 20,
                  borderRadius: 10,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor:
                    step.tone === 'lime' ? brand.lime : step.tone === 'pink' ? brand.pink : theme.violet,
                }}
              >
                <AppText
                  style={{
                    fontSize: 11,
                    fontWeight: '800',
                    color:
                      step.tone === 'lime'
                        ? brand.limeInk
                        : step.tone === 'pink'
                          ? brand.pinkInk
                          : theme.bg,
                  }}
                >
                  {index + 1}
                </AppText>
              </View>
              <AppText tone="muted" style={{ flex: 1, fontSize: 12, lineHeight: 17.4 }}>
                <AppText style={{ fontSize: 12, fontWeight: '800' }}>{step.title}</AppText> —{' '}
                {step.body}
              </AppText>
            </View>
          ))}
        </View>
      ) : null}

      <Button label={cta} size="lg" onPress={onPress} />

      {footnote ? (
        <AppText tone="muted" style={{ fontSize: 11, textAlign: 'center' }}>
          {footnote}
        </AppText>
      ) : null}
    </GlowGround>
  );
}
