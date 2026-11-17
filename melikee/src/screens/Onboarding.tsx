/**
 * Onboarding. MeLikee is 13+ only, and every account is a verified phone.
 *
 *   sign up:  birthday (13+) → phone → code → handle → parent (under 18, optional)
 *             → where new shinies go → find your people
 *   sign in:  phone → code → back in, with the lists you'd shared
 *   verify:   for anyone already using the app without a verified phone
 */
import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { handleNote, useHandleCheck } from '@/components/useHandleCheck';
import { formatPhone, phoneDigits, sendCode, verifyCode } from '@/lib/auth';
import type { VerifyResponse } from '@/lib/authContract';
import { ageOn, DAYS, MONTHS, type Month } from '@/lib/dates';
import { useApp } from '@/store/useApp';
import { brand, font, palette } from '@/theme/tokens';
import { Chevron, Sparkle } from '@/ui/icons';
import { Appear } from '@/ui/motion';
import { AccentButton, Field, LimeButton, Radio, RadialGround, Select, T, Tap } from '@/ui/primitives';

type Mode = 'signup' | 'signin' | 'verify';
type Step = 'welcome' | 'verifyIntro' | 'birthday' | 'phone' | 'code' | 'handle' | 'parent' | 'sharing' | 'people';

const RESEND_SECONDS = 30;

export function Onboarding() {
  const insets = useSafeAreaInsets();
  const profile = useApp((s) => s.profile);
  const onboarded = useApp((s) => s.onboarded);
  const verified = useApp((s) => !!s.phone);
  const ageBlocked = useApp((s) => s.ageBlocked);
  const ownerSecret = useApp((s) => s.ownerSecret);
  const finish = useApp((s) => s.finishOnboarding);
  const applySignIn = useApp((s) => s.applySignIn);
  const showToast = useApp((s) => s.showToast);

  // Someone already using the app without a verified phone gets the short path.
  const [mode, setMode] = useState<Mode>(onboarded && !verified ? 'verify' : 'signup');
  const [step, setStep] = useState<Step>(onboarded && !verified ? 'verifyIntro' : 'welcome');

  const thisYear = new Date().getFullYear();
  const years = Array.from({ length: 96 }, (_, i) => String(thisYear - 5 - i));
  const [month, setMonth] = useState<Month>(profile.birthday.month);
  const [day, setDay] = useState(String(profile.birthday.day));
  const [year, setYear] = useState(String(Math.min(profile.birthday.year, thisYear - 5)));
  const birth = { month, day: parseInt(day, 10), year: parseInt(year, 10) };
  const age = ageOn(birth);

  const [phone, setPhone] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noAccount, setNoAccount] = useState(false);
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (step !== 'code') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [step]);

  const [handle, setHandle] = useState(profile.handle);
  const [parent, setParent] = useState(profile.parent?.contact ?? '');
  const [priv, setPriv] = useState(false);
  const h = handle.trim();
  const hStatus = useHandleCheck(h);
  const hOk = hStatus === 'free' || hStatus === 'unknown';

  const order: Step[] =
    mode === 'signin'
      ? ['welcome', 'phone', 'code']
      : mode === 'verify'
        ? ['verifyIntro', 'phone', 'code']
        : ['welcome', 'birthday', 'phone', 'code', 'handle', ...(age < 18 ? (['parent'] as Step[]) : []), 'sharing', 'people'];
  const index = order.indexOf(step);
  const go = (s: Step) => {
    setError(null);
    setStep(s);
  };
  const next = () => go(order[index + 1]);
  const back = () => {
    // Once a code is accepted there's no going back to it.
    if (step === 'handle') return;
    if (index > 0) go(order[index - 1]);
    if (step === 'phone' && mode === 'signin') setMode('signup');
  };

  // ── phone + code ──
  const text = async () => {
    if (phoneDigits(phone).length !== 10 || busy) return;
    setBusy(true);
    setError(null);
    const r = await sendCode(phoneDigits(phone));
    setBusy(false);
    if (!r.ok) {
      setError(r.message);
      return;
    }
    setCode('');
    setResendAt(Date.now() + RESEND_SECONDS * 1000);
    setNow(Date.now());
    if (step !== 'code') go('code');
  };

  const check = async (value: string) => {
    if (value.length !== 6 || busy) return;
    setBusy(true);
    setError(null);
    setNoAccount(false);
    const r: VerifyResponse = await verifyCode({
      phone: phoneDigits(phone),
      code: value,
      birth: mode === 'signin' ? undefined : { year: birth.year, month: MONTHS.indexOf(month) + 1, day: birth.day },
      deviceSecret: ownerSecret,
    });
    setBusy(false);
    if (!r.ok) {
      if (r.code === 'too_young') useApp.setState({ ageBlocked: true });
      else if (r.code === 'needs_birthday') setNoAccount(true);
      else setError(r.message);
      setCode('');
      return;
    }
    applySignIn(r);
    if (r.kind === 'restored' || mode !== 'signup') {
      // Back in (or just verified): straight to the app.
      useApp.setState({ onboarded: true, stack: [{ name: 'feed' }] });
      showToast(r.kind === 'restored' ? `Welcome back, @${useApp.getState().profile.handle}` : 'Phone verified ✓');
      return;
    }
    next();
  };

  const done = () => {
    finish({ handle: h, birthday: birth, parent: parent.trim(), privateDefault: priv });
    showToast(`Welcome, @${h}`);
  };

  // ── layout pieces ──
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
  const nextBtn = (label: string, onPress: () => void = next, disabled = false) => <LimeButton label={label} size={15} pad={15} disabled={disabled || busy} onPress={onPress} />;
  const errorLine = error ? (
    <T size={12.5} w={600} color={brand.pink} style={{ marginTop: -8 }} accessibilityLiveRegion="polite">
      {error}
    </T>
  ) : null;
  const inputBox = { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.vio44, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 14 };

  if (ageBlocked) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top, paddingHorizontal: 32, justifyContent: 'center', alignItems: 'center', gap: 12 }}>
        <RadialGround inner={palette.rad1} outer={palette.bg} cy="0%" rx="80%" ry="70%" />
        <Sparkle size={18} color={palette.limeText} />
        <T size={26} w={800} style={{ textAlign: 'center', letterSpacing: -0.6 }}>
          MeLikee is for 13 and up
        </T>
        <T size={14} color={palette.soft} style={{ textAlign: 'center', lineHeight: 21, maxWidth: 290 }}>
          We’ll be here when you’re ready. Until then, a grown-up can make a list and share it with you.
        </T>
      </View>
    );
  }

  const showBar = step !== 'welcome' && step !== 'verifyIntro';
  const total = order.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: palette.bg, paddingTop: insets.top }}>
      <RadialGround inner={palette.rad1} outer={palette.bg} cy="0%" rx="80%" ry="70%" />
      {showBar ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingTop: 12, paddingHorizontal: 20 }}>
          <Tap onPress={back} disabled={step === 'handle'} accessibilityLabel="Back" style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center', opacity: step === 'handle' ? 0 : 1 }}>
            <Chevron color={palette.muted} />
          </Tap>
          <View style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: palette.chip, overflow: 'hidden' }}>
            <View style={{ height: '100%', width: `${Math.round((index / total) * 100)}%`, backgroundColor: brand.lime }} />
          </View>
          <T size={11.5} w={600} color={palette.muted} style={{ width: 32, textAlign: 'right' }}>
            {index}/{total}
          </T>
        </View>
      ) : null}
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, gap: 16, paddingTop: 28, paddingHorizontal: 24, paddingBottom: 40 + insets.bottom }}>
        <Appear key={step + mode} style={{ flex: 1, gap: 16 }}>
          {step === 'welcome' ? (
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
              {nextBtn('Get started', () => {
                setMode('signup');
                go('birthday');
              })}
              <Tap
                onPress={() => {
                  setMode('signin');
                  go('phone');
                }}
                style={{ alignItems: 'center', padding: 12 }}
              >
                <T size={13.5} w={700} color={palette.soft}>
                  I already have an account
                </T>
              </Tap>
            </>
          ) : null}

          {step === 'verifyIntro' ? (
            <>
              <View style={{ flex: 1, justifyContent: 'center', gap: 14 }}>
                {title('Verify your phone', 'MeLikee now signs in with your phone number. It keeps your page yours, even on a new phone. We text you a code; your number stays private.')}
              </View>
              {nextBtn('Continue', () => go('phone'))}
            </>
          ) : null}

          {step === 'birthday' ? (
            <>
              {title('When’s your birthday?', 'It powers your countdown. Your year stays private — MeLikee is for 13 and up.')}
              <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
                <Select value={month} options={MONTHS} onChange={setMonth} size={15} pad={13} style={{ flex: 1 }} accessibilityLabel="Month" />
                <Select value={day} options={DAYS} onChange={setDay} size={15} pad={13} style={{ flex: 1 }} accessibilityLabel="Day" />
                <Select value={year} options={years} onChange={setYear} size={15} pad={13} style={{ flex: 1 }} accessibilityLabel="Year" />
              </View>
              <View style={{ flex: 1 }} />
              {nextBtn('Next', () => (age < 13 ? useApp.setState({ ageBlocked: true }) : next()))}
            </>
          ) : null}

          {step === 'phone' ? (
            <>
              {title(mode === 'signin' ? 'Welcome back' : 'What’s your number?', mode === 'signin' ? 'Enter the number you signed up with and we’ll text you a code.' : 'We’ll text you a code to sign in. Your number stays private — friends find you by your handle.')}
              <View style={inputBox}>
                <T size={15} w={600} color={palette.muted}>
                  +1
                </T>
                <TextInput
                  value={phone}
                  onChangeText={(v) => setPhone(formatPhone(v))}
                  onSubmitEditing={text}
                  placeholder="(555) 123-4567"
                  placeholderTextColor={palette.muted}
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  autoFocus
                  accessibilityLabel="Phone number"
                  style={{ flex: 1, fontSize: 15, fontFamily: font[600], color: palette.text, padding: 0, outlineWidth: 0 }}
                />
              </View>
              {errorLine}
              <T size={11.5} color={palette.muted} style={{ lineHeight: 17 }}>
                US and Canadian mobile numbers for now. Message and data rates may apply.
              </T>
              <View style={{ flex: 1 }} />
              {nextBtn(busy ? 'Sending…' : 'Text me a code', text, phoneDigits(phone).length !== 10)}
            </>
          ) : null}

          {step === 'code' ? (
            <>
              {title('Enter your code', `We texted a 6-digit code to ${phone}.`)}
              <TextInput
                value={code}
                onChangeText={(v) => {
                  const c = v.replace(/\D/g, '').slice(0, 6);
                  setCode(c);
                  if (c.length === 6) void check(c);
                }}
                placeholder="••••••"
                placeholderTextColor={palette.muted}
                keyboardType="number-pad"
                autoComplete="one-time-code"
                textContentType="oneTimeCode"
                maxLength={6}
                autoFocus
                accessibilityLabel="Code"
                style={{ backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.vio44, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 14, fontSize: 26, letterSpacing: 10, textAlign: 'center', fontFamily: font[700], color: palette.text }}
              />
              {errorLine}
              {noAccount ? (
                <View style={{ backgroundColor: palette.inset, borderRadius: 14, padding: 14, gap: 10 }}>
                  <T size={13} w={700}>
                    No account for {phone} yet.
                  </T>
                  <AccentButton
                    label="Sign up instead"
                    size={13}
                    pad={11}
                    onPress={() => {
                      setNoAccount(false);
                      setMode('signup');
                      go('birthday');
                    }}
                  />
                </View>
              ) : null}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Tap onPress={() => go('phone')} style={{ paddingVertical: 8 }}>
                  <T size={13} w={700} color={palette.soft}>
                    Wrong number?
                  </T>
                </Tap>
                <Tap onPress={text} disabled={now < resendAt || busy} style={{ paddingVertical: 8 }}>
                  <T size={13} w={700} color={now < resendAt ? palette.muted : palette.vio}>
                    {now < resendAt ? `Resend in ${Math.ceil((resendAt - now) / 1000)}s` : 'Send a new code'}
                  </T>
                </Tap>
              </View>
              <View style={{ flex: 1 }} />
              {nextBtn(busy ? 'Checking…' : 'Continue', () => void check(code), code.length !== 6)}
            </>
          ) : null}

          {step === 'handle' ? (
            <>
              {title('Pick a handle', 'This is how friends find you. You can change it later.')}
              <View style={inputBox}>
                <T size={15} w={600} color={palette.muted}>
                  @
                </T>
                <TextInput
                  value={handle}
                  onChangeText={(v) => setHandle(v.toLowerCase().replace(/\s/g, ''))}
                  autoCapitalize="none"
                  autoCorrect={false}
                  accessibilityLabel="Handle"
                  style={{ flex: 1, fontSize: 15, fontFamily: font[600], color: palette.text, padding: 0, outlineWidth: 0 }}
                />
              </View>
              <T size={12.5} w={600} color={hOk ? palette.limeText : hStatus === 'checking' ? palette.muted : brand.pink} style={{ marginTop: -8 }}>
                {handleNote(h, hStatus)}
              </T>
              <View style={{ flex: 1 }} />
              {nextBtn('Next', next, !hOk)}
            </>
          ) : null}

          {step === 'parent' ? (
            <>
              {title('Add a parent?', 'Optional. Some families like it — you can always add one later in Settings.')}
              <Field value={parent} onChangeText={setParent} placeholder="Parent's phone or email" autoCapitalize="none" keyboardType="email-address" style={{ fontSize: 15, fontFamily: font[600], paddingVertical: 13, paddingHorizontal: 14, borderRadius: 14 }} />
              <View style={{ backgroundColor: palette.inset, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14 }}>
                <T size={12} color={palette.soft} style={{ lineHeight: 18.5 }}>
                  They’ll see your shared lists and friends. Never your private lists, and never who called dibs.
                </T>
              </View>
              <View style={{ flex: 1 }} />
              {nextBtn(parent.trim() ? 'Send request' : 'Next')}
              <Tap
                onPress={() => {
                  setParent('');
                  next();
                }}
                style={{ alignItems: 'center', padding: 12 }}
              >
                <T size={13.5} w={700} color={palette.soft}>
                  Skip for now
                </T>
              </Tap>
            </>
          ) : null}

          {step === 'sharing' ? (
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

          {step === 'people' ? (
            <>
              {title('Bring your people', 'Share your list link with friends and family — they can call dibs without the app. Find friends on MeLikee from the Friends tab.')}
              <View style={{ flex: 1 }} />
              {nextBtn('Start snapping', done)}
            </>
          ) : null}
        </Appear>
      </ScrollView>
    </View>
  );
}
