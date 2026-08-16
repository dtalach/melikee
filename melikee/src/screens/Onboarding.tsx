/**
 * First run.
 *
 * Before this, opening MeLikee for the first time made you Maya: her name, her
 * handle, her public link, her three lists, her six shinies, four friends you
 * had never met, and a stranger asking to follow you. It read as a demo because
 * it was one.
 *
 * Four screens now stand in front of that. They ask for one thing that matters
 * (a name, which becomes the handle and the public link), one thing that the
 * countdown on the camera screen needs (a birthday, skippable), and the camera
 * permission — asked for on arrival at the screen that explains why, rather
 * than as an ambush on the first shutter press. The welcome screen also offers
 * the demo account outright, because showing someone the full app is a real
 * thing people need to do.
 */
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';

import { BirthdayPicker } from '@/components/BirthdayPicker';
import { useCameraAccess } from '@/hooks/useCameraAccess';
import { useTopInset } from '@/hooks/useTopInset';
import { MONTHS } from '@/store/profile';
import { useAppStore } from '@/store/useAppStore';
import { SparkleIcon } from '@/ui/icons';
import { RiseIn, SlapIn, Twinkle } from '@/ui/motion';
import { AppText, Button, GlowGround, Squish, Sticker, webInputReset } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';

type Step = 'welcome' | 'name' | 'birthday' | 'camera';

export function Onboarding() {
  const theme = useTheme();
  const topInset = useTopInset();

  const completeOnboarding = useAppStore((s) => s.completeOnboarding);
  const useDemoAccount = useAppStore((s) => s.useDemoAccount);

  const [step, setStep] = useState<Step>('welcome');
  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState<{ month: number; day: number }>();

  // Only ask once they've actually reached the camera step — the screen that
  // explains why — rather than the moment onboarding opens.
  const { requestPermission, granted, canAsk, pending } = useCameraAccess({ ask: step === 'camera' });

  const trimmed = name.trim();

  // The account is created when they leave the last screen, not the first —
  // so backing out halfway leaves nothing behind.
  const finish = () => completeOnboarding({ name: trimmed, birthday });

  return (
    <GlowGround
      edge="page"
      style={{
        position: 'absolute',
        inset: 0,
        backgroundColor: theme.bg,
        zIndex: 20,
      }}
    >
      <Twinkle size={14} color={brand.lime} duration={2200} style={{ position: 'absolute', top: 120, left: 42 }} />
      <Twinkle size={10} color={brand.pink} duration={2800} delay={600} style={{ position: 'absolute', top: 180, right: 48 }} />
      <Twinkle size={9} color={theme.violet} duration={3100} delay={1200} style={{ position: 'absolute', bottom: 150, left: 60 }} />

      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: 'center',
          paddingTop: topInset + 40,
          paddingBottom: 40,
          paddingHorizontal: 30,
          gap: 18,
        }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'welcome' ? (
          <RiseIn style={{ gap: 16, alignItems: 'center' }}>
            <SparkleIcon size={34} color={brand.lime} />
            <AppText glow style={{ fontSize: 32, fontWeight: '800', letterSpacing: -0.96 }}>
              Ooh. Shiny.
            </AppText>
            <AppText tone="soft" style={{ fontSize: 14, textAlign: 'center', lineHeight: 21 }}>
              Point your camera at anything you want. MeLikee finds it, prices it, and
              puts it on a list your people can actually shop from.
            </AppText>
            <SlapIn>
              <Sticker>YOUR WISHLIST WRITES ITSELF</Sticker>
            </SlapIn>

            <Button
              label="Let’s go"
              size="lg"
              style={{ alignSelf: 'stretch', marginTop: 6 }}
              onPress={() => setStep('name')}
            />

            {/* Kept deliberately: showing someone the whole app, populated, is
                a real need — and it says outright that it isn't yours. */}
            <Squish onPress={useDemoAccount} hitSlop={8}>
              <AppText tone="muted" style={{ fontSize: 12, fontWeight: '700' }}>
                Just show me a demo account
              </AppText>
            </Squish>
          </RiseIn>
        ) : null}

        {step === 'name' ? (
          <RiseIn style={{ gap: 14 }}>
            <AppText style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.78 }}>
              What should we call you?
            </AppText>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 18 }}>
              First name is plenty. It becomes your handle and the link you send people.
            </AppText>

            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Maya"
              placeholderTextColor={theme.muted}
              autoFocus
              autoCapitalize="words"
              autoCorrect={false}
              returnKeyType="next"
              onSubmitEditing={() => trimmed && setStep('birthday')}
              style={[
                {
                  backgroundColor: theme.inset,
                  borderWidth: 2,
                  borderColor: theme.violet44,
                  borderRadius: layout.radius.chip,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                  fontSize: 16,
                  fontWeight: '700',
                  color: theme.text,
                },
                webInputReset,
              ]}
            />

            {trimmed ? (
              <AppText tone="violet" style={{ fontSize: 12, fontWeight: '700' }}>
                melikee.app/{handlePreview(trimmed)}
              </AppText>
            ) : null}

            <Button
              label="Next"
              size="lg"
              style={{ alignSelf: 'stretch', opacity: trimmed ? 1 : 0.5 }}
              onPress={() => trimmed && setStep('birthday')}
            />
          </RiseIn>
        ) : null}

        {step === 'birthday' ? (
          <RiseIn style={{ gap: 14 }}>
            <AppText style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.78 }}>
              When’s your birthday?
            </AppText>
            <AppText tone="muted" style={{ fontSize: 12.5, lineHeight: 18 }}>
              So the countdown works and your people get a nudge in time. No year, no age.
            </AppText>

            <BirthdayPicker month={birthday?.month} day={birthday?.day} onChange={setBirthday} />

            <Button
              label={birthday ? `${MONTHS[birthday.month]} ${birthday.day} it is` : 'Pick a day'}
              size="lg"
              style={{ alignSelf: 'stretch', opacity: birthday ? 1 : 0.5 }}
              onPress={() => birthday && setStep('camera')}
            />
            <Squish onPress={() => setStep('camera')} hitSlop={8}>
              <AppText tone="muted" style={{ fontSize: 12, fontWeight: '700', textAlign: 'center' }}>
                Skip — I’ll add it later
              </AppText>
            </Squish>
          </RiseIn>
        ) : null}

        {step === 'camera' ? (
          <RiseIn style={{ gap: 14, alignItems: 'center' }}>
            <AppText style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.78, textAlign: 'center' }}>
              Nice to meet you, {trimmed.split(' ')[0]}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 12.5, textAlign: 'center', lineHeight: 19 }}>
              You’ve got My wants and a Secret stash, both empty. The camera is how
              they fill up — snap a thing, scan a barcode, or just say what you want.
            </AppText>

            {/* The permission dialog is already up — this screen is the
                explanation standing behind it, not a button in front of it. */}
            {granted ? (
              <AppText tone="lime" style={{ fontSize: 12.5, fontWeight: '800' }}>
                Camera’s on. ✓
              </AppText>
            ) : pending ? null : canAsk ? (
              <Squish onPress={() => void requestPermission()} hitSlop={8}>
                <AppText tone="violet" style={{ fontSize: 12.5, fontWeight: '800' }}>
                  Ask me again
                </AppText>
              </Squish>
            ) : (
              <AppText tone="muted" style={{ fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
                No camera for now — you can turn it on in Settings whenever you like.
              </AppText>
            )}

            <Button
              label={granted ? 'Start snapping' : 'Carry on without it'}
              size="lg"
              style={{ alignSelf: 'stretch', marginTop: 4 }}
              onPress={finish}
            />
          </RiseIn>
        ) : null}

        {/* Where you are, without a progress bar's air of paperwork. */}
        <View style={{ flexDirection: 'row', gap: 6, justifyContent: 'center', paddingTop: 8 }}>
          {(['welcome', 'name', 'birthday', 'camera'] as Step[]).map((s) => (
            <View
              key={s}
              style={{
                width: s === step ? 18 : 6,
                height: 6,
                borderRadius: 3,
                backgroundColor: s === step ? brand.lime : theme.violet44,
              }}
            />
          ))}
        </View>
      </ScrollView>
    </GlowGround>
  );
}

/** Mirrors `makeProfile`'s slug rule, so the preview is the real link. */
function handlePreview(name: string): string {
  const first = name.split(' ')[0] ?? '';
  return (
    first
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]/g, '') || 'you'
  );
}
