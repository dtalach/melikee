/**
 * Creating a list.
 *
 * The prototype's "+ New list" pill was a visual placeholder. Since every list
 * carries a default visibility (the turn-7 model), creating one has to ask for
 * exactly two things — a name and who can see it — and nothing else.
 */
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { BottomSheet } from '@/components/sheets/BottomSheet';
import { GlobeIcon, LockIcon } from '@/ui/icons';
import { AppText, Button, Eyebrow, Squish, webInputReset } from '@/ui/primitives';
import { layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import type { Visibility } from '@/store/types';

const OPTIONS: { id: Visibility; label: string; hint: string }[] = [
  { id: 'friends', label: 'Friends can see it', hint: 'shows up in their Feed' },
  { id: 'invite', label: 'Invite-only', hint: 'just the people you pick' },
  { id: 'me', label: 'Just me', hint: 'never shown to anyone' },
];

export function NewListSheet() {
  const theme = useTheme();
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<Visibility>('friends');

  const createList = useAppStore((s) => s.createList);
  const closeSheet = useAppStore((s) => s.closeSheet);

  const create = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    createList(trimmed, visibility);
    closeSheet();
  };

  return (
    <BottomSheet onClose={closeSheet}>
      <AppText style={{ fontSize: 17, fontWeight: '800' }}>New list</AppText>

      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Sweet 16, Christmas, skate stuff…"
        placeholderTextColor={theme.muted}
        autoFocus
        returnKeyType="done"
        onSubmitEditing={create}
        style={{
          backgroundColor: theme.inset,
          borderWidth: 1.5,
          borderColor: theme.violet44,
          borderRadius: layout.radius.chip,
          paddingHorizontal: 13,
          paddingVertical: 12,
          fontSize: 14,
          fontWeight: '700',
          color: theme.text,
          ...webInputReset,
        }}
      />

      <View style={{ gap: 7 }}>
        <Eyebrow>WHO CAN SEE IT?</Eyebrow>
        {OPTIONS.map((option) => {
          const selected = visibility === option.id;
          return (
            <Squish key={option.id} onPress={() => setVisibility(option.id)}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  backgroundColor: theme.inset,
                  borderWidth: 1.5,
                  borderColor: selected ? theme.lime66 : theme.violet22,
                  borderRadius: layout.radius.chip,
                  paddingHorizontal: 14,
                  paddingVertical: 11,
                }}
              >
                {option.id === 'me' ? (
                  <LockIcon size={13} color={theme.violet} />
                ) : (
                  <GlobeIcon size={13} color={selected ? theme.limeText : theme.muted} />
                )}
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 13, fontWeight: '800' }}>{option.label}</AppText>
                  <AppText tone="muted" style={{ fontSize: 10.5 }}>
                    {option.hint}
                  </AppText>
                </View>
                <View
                  style={{
                    width: 18,
                    height: 18,
                    borderRadius: 9,
                    borderWidth: 2,
                    borderColor: selected ? theme.limeText : theme.violet44,
                    backgroundColor: selected ? theme.limeText : 'transparent',
                  }}
                />
              </View>
            </Squish>
          );
        })}
      </View>

      <Button label="Make the list" size="lg" onPress={create} style={{ alignSelf: 'stretch' }} />
    </BottomSheet>
  );
}
