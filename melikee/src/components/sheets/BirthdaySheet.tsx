/**
 * Setting a birthday after the fact.
 *
 * Onboarding lets you skip it, and plenty of people will. The camera's pill
 * and the Me card both become the way back here, because the countdown is one
 * of the two things the app promises and it can't run without a date.
 */
import { useState } from 'react';
import { View } from 'react-native';

import { BirthdayPicker } from '@/components/BirthdayPicker';
import { BottomSheet } from '@/components/sheets/BottomSheet';
import { MONTHS } from '@/store/profile';
import { useAppStore } from '@/store/useAppStore';
import { AppText, Button, Squish } from '@/ui/primitives';

export function BirthdaySheet() {
  const profile = useAppStore((s) => s.profile);
  const setBirthday = useAppStore((s) => s.setBirthday);
  const closeSheet = useAppStore((s) => s.closeSheet);

  const [picked, setPicked] = useState<{ month: number; day: number } | undefined>(
    profile.birthdayMonth != null && profile.birthdayDay != null
      ? { month: profile.birthdayMonth, day: profile.birthdayDay }
      : undefined,
  );

  return (
    <BottomSheet onClose={closeSheet}>
      <AppText style={{ fontSize: 17, fontWeight: '800' }}>When’s your birthday?</AppText>
      <AppText tone="muted" style={{ fontSize: 12, marginTop: -4 }}>
        Friends who can see one of your lists can see this. No year, no age.
      </AppText>

      <BirthdayPicker month={picked?.month} day={picked?.day} onChange={setPicked} />

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Button
          label={picked ? `Save ${MONTHS[picked.month]} ${picked.day}` : 'Pick a day'}
          size="lg"
          style={{ flex: 1, opacity: picked ? 1 : 0.5 }}
          onPress={() => {
            if (!picked) return;
            setBirthday(picked);
            closeSheet();
          }}
        />
        {profile.birthdayMonth != null ? (
          <Squish
            onPress={() => {
              setBirthday(undefined);
              closeSheet();
            }}
            hitSlop={8}
          >
            <AppText tone="muted" style={{ fontSize: 12, fontWeight: '800' }}>
              Clear
            </AppText>
          </Squish>
        ) : null}
      </View>
    </BottomSheet>
  );
}
