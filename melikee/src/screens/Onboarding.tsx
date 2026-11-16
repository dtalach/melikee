/**
 * Onboarding (spec): birthday → handle → parent → default sharing → contacts.
 * Under 13, a parent must be added before going on.
 */
import { useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ageOn, DAYS, MONTHS, type Month } from '@/lib/dates';
import { useApp } from '@/store/useApp';
import { brand, font, palette } from '@/theme/tokens';
import { Chevron, Sparkle } from '@/ui/icons';
import { Appear } from '@/ui/motion';
import { AccentButton, Field, LimeButton, Radio, RadialGround, Select, T, Tap } from '@/ui/primitives';

const TAKEN = new Set(['maya', 'melikee', 'admin']);
const HANDLE = /^[a-z0-9_.]{3,20}$/;

export function Onboarding() {
  const insets = useSafeAreaInsets();
  const profile = useApp((s) => s.profile);
  const onboarded = useApp((s) => s.onboarded);
  const finish = useApp((s) => s.finishOnboarding);
  const showToast = useApp((s) => s.showToast);

  const [step, setStep] = useState(0);
  const [month, setMonth] = useState<Month>(profile.birthday.month);
  const [day, setDay] = useState(String(profile.birthday.day));
  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 14 }, (_, i) => String(thisYear - 9 - i));
  const [year, setYear] = useState(String(Math.min(profile.birthday.year, thisYear - 9)));
  const [handle, setHandle] = useState(profile.handle);
  const [parent, setParent] = useState(profile.parent?.contact ?? '');
  const [priv, setPriv] = useState(false);
  const [contacts, setContacts] = useState(false);

  const age = ageOn({ month, day: parseInt(day, 10), year: parseInt(year, 10) });
  const under13 = age < 13;
  const h = handle.trim();
  const hOk = HANDLE.test(h) && !TAKEN.has(h);
  const blocked = (step === 2 && !hOk) || (step === 3 && under13 && !parent.trim());

  const next = () => {
    if (!blocked) setStep((x) => x + 1);
  };
  const done = () => {
    finish({ handle: h, birthday: { month, day: parseInt(day, 10), year: parseInt(year, 10) }, parent: under13 || parent.trim() ? parent : '', privateDefault: priv });
    showToast(`Welcome, @${h}`);
  };

  const title = (t: string, sub: string) => (
    <>
      <T size={28} w={800} style={{ letterSpacing: -0.84, lineHeight: 31 }}>
        {t}
      </T>
      <T size={13.5} color={palette.muted} style={{ lineHeight: 20, marginTop: -4 }}>
        {sub}
      </T>
    </>
  );
  const nextBtn = (label: string, onPress = next) => <LimeButton label={label} size={15} pad={15} disabled={blocked} onPress={onPress} />;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top }}>
      <RadialGround inner={palette.rad1} outer={palette.bg} cy="0%" rx="80%" ry="70%" />
      {step > 0 ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingHorizontal: 20 }}>
          <Tap onPress={() => setStep((x) => Math.max(0, x - 1))} accessibilityLabel="Back" style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Chevron color={palette.muted} />
          </Tap>
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: palette.chip, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.round((step / 5) * 100)}%`, backgroundColor: brand.lime }} />
          </View>
          <T size={11.5} w={600} color={palette.muted} style={{ width: 32, textAlign: 'right' }}>
            {step}/5
          </T>
        </View>
      ) : null}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, gap: 16, paddingTop: 28, paddingHorizontal: 24, paddingBottom: 40 + insets.bottom }}>
        <Appear key={step} style={{ flex: 1, gap: 16 }}>
          {step === 0 ? (
            <>
              <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Sparkle size={14} color={palette.limeText} />
                  <T size={15} w={800} color={palette.limeText}>
                    MeLikee
                  </T>
                </View>
                <T size={40} w={800} style={{ letterSpacing: -1.6, lineHeight: 42 }}>
                  Ooh. Shiny.
                </T>
                <T size={15} color={palette.soft} style={{ maxWidth: 270, lineHeight: 22.5, textAlign: 'center' }}>
                  Snap what you want. Friends see it. Family calls dibs. No more guessing gifts.
                </T>
              </View>
              {nextBtn('Get started')}
              <Tap
                onPress={() => {
                  useApp.setState({ onboarded: true, stack: [{ name: 'feed' }] });
                }}
                style={{ alignItems: 'center', padding: 12 }}
              >
                <T size={13.5} w={700} color={palette.soft}>
                  {onboarded ? 'Back to the app' : 'I already have an account'}
                </T>
              </Tap>
            </>
          ) : null}

          {step === 1 ? (
            <>
              {title('When’s your birthday?', 'It powers your countdown. Your year stays private — we use it to keep things age-appropriate.')}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Select value={month} options={MONTHS} onChange={setMonth} size={15} pad={13} style={{ flex: 1 }} accessibilityLabel="Month" />
                <Select value={day} options={DAYS} onChange={setDay} size={15} pad={13} style={{ flex: 1 }} accessibilityLabel="Day" />
                <Select value={year} options={years} onChange={setYear} size={15} pad={13} style={{ flex: 1 }} accessibilityLabel="Year" />
              </View>
              <View style={{ flex: 1 }} />
              {nextBtn('Next')}
            </>
          ) : null}

          {step === 2 ? (
            <>
              {title('Pick a handle', 'This is how friends find you. You can change it later.')}
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.vio44, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14 }}>
                <T size={15} w={600} color={palette.muted}>
                  @
                </T>
                <TextInput
                  value={handle}
                  onChangeText={(v) => setHandle(v.toLowerCase().replace(/\s/g, ''))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Handle"
                  style={{ flex: 1, fontSize: 15, fontFamily: font[600], color: palette.text, padding: 0 }}
                />
              </View>
              <T size={12.5} w={600} color={hOk ? palette.limeText : brand.pink} style={{ marginTop: -8 }}>
                {hOk ? `✓ @${h} is yours` : TAKEN.has(h) ? `@${h} is taken — try another` : '3–20 letters, numbers, _ or .'}
              </T>
              <View style={{ flex: 1 }} />
              {nextBtn('Next')}
            </>
          ) : null}

          {step === 3 ? (
            <>
              {title(
                under13 ? 'Add a parent' : 'Add a parent?',
                under13 ? 'You’re under 13, so a parent needs to say OK before you can add friends.' : 'Optional. Some families like it — you can always add one later.',
              )}
              <Field value={parent} onChangeText={setParent} placeholder="Parent's phone or email" autoCapitalize="none" keyboardType="email-address" style={{ fontSize: 15, fontFamily: font[600], paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14 }} />
              <View style={{ backgroundColor: palette.inset, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 }}>
                <T size={12} color={palette.soft} style={{ lineHeight: 18.5 }}>
                  They’ll see your shared lists and approve new friends. Never your private lists, and never who called dibs.
                </T>
              </View>
              <View style={{ flex: 1 }} />
              {nextBtn(under13 ? 'Send them a request' : parent.trim() ? 'Send request' : 'Next')}
              {!under13 ? (
                <Tap
                  onPress={() => {
                    setParent('');
                    setStep(4);
                  }}
                  style={{ alignItems: 'center', padding: 12 }}
                >
                  <T size={13.5} w={700} color={palette.soft}>
                    Skip for now
                  </T>
                </Tap>
              ) : null}
            </>
          ) : null}

          {step === 4 ? (
            <>
              {title('Where do new shinies go?', 'You can change any list later.')}
              {(
                [
                  [false, 'My wants, shared with friends', 'Friends you approve see what you add. Best for getting gifts right.'],
                  [true, 'Private until I share', 'Everything starts just for you. Share a list when you’re ready.'],
                ] as const
              ).map(([p, t, sub]) => (
                <Tap
                  key={t}
                  onPress={() => setPriv(p)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: priv === p }}
                  style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, padding: 14, borderRadius: 16, borderWidth: 1.5, borderColor: priv === p ? palette.vio : palette.vio33, backgroundColor: priv === p ? palette.vio22 : 'transparent' }}
                >
                  <View style={{ flex: 1 }}>
                    <T size={14.5} w={700}>
                      {t}
                    </T>
                    <T size={12} color={palette.muted} style={{ marginTop: 2, lineHeight: 17.5 }}>
                      {sub}
                    </T>
                  </View>
                  <View style={{ marginTop: 2 }}>
                    <Radio on={priv === p} />
                  </View>
                </Tap>
              ))}
              <View style={{ flex: 1 }} />
              {nextBtn('Next')}
            </>
          ) : null}

          {step === 5 ? (
            <>
              {title('Find your people', 'See who’s already on MeLikee. We only show people you know.')}
              <AccentButton
                label={contacts ? '4 friends found ✓' : 'Check my contacts'}
                size={14}
                pad={14}
                onPress={() => {
                  setContacts(true);
                  showToast('Found 4 friends — Ava, Jordan, Sam, Mia');
                }}
              />
              <View style={{ flex: 1 }} />
              {nextBtn('Start snapping', done)}
            </>
          ) : null}
        </Appear>
      </ScrollView>
    </View>
  );
}
