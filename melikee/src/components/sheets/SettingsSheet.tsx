/**
 * Settings, collapsed behind the gear on Me so they stop pretending to be
 * content (turn 10a). Two of these are real product decisions rather than
 * chrome: the theme, which the light-mode exploration earned, and reduce
 * motion, which the ritual is deliberately designed to degrade into.
 */
import { View } from 'react-native';

import { BottomSheet } from '@/components/sheets/BottomSheet';
import { AppText, Eyebrow, Squish, Toggle } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';
import type { ThemePreference } from '@/theme/ThemeProvider';

const THEMES: { id: ThemePreference; label: string }[] = [
  { id: 'system', label: 'System' },
  { id: 'dark', label: 'Dark' },
  { id: 'light', label: 'Light' },
];

export function SettingsSheet() {
  const theme = useTheme();

  const themePreference = useAppStore((s) => s.themePreference);
  const setThemePreference = useAppStore((s) => s.setThemePreference);
  const reduceMotion = useAppStore((s) => s.reduceMotion);
  const setReduceMotion = useAppStore((s) => s.setReduceMotion);
  const closeSheet = useAppStore((s) => s.closeSheet);
  const demoContent = useAppStore((s) => s.demoContent);
  const profile = useAppStore((s) => s.profile);
  const startOver = useAppStore((s) => s.startOver);

  return (
    <BottomSheet onClose={closeSheet}>
      <AppText style={{ fontSize: 17, fontWeight: '800' }}>Settings</AppText>

      <View style={{ gap: 7 }}>
        <Eyebrow>APPEARANCE</Eyebrow>
        <View
          style={{
            flexDirection: 'row',
            gap: 6,
            backgroundColor: theme.inset,
            borderRadius: layout.radius.pill,
            padding: 4,
          }}
        >
          {THEMES.map((option) => {
            const selected = themePreference === option.id;
            return (
              <Squish
                key={option.id}
                onPress={() => setThemePreference(option.id)}
                style={{ flex: 1 }}
              >
                <View
                  style={{
                    alignItems: 'center',
                    paddingVertical: 9,
                    borderRadius: layout.radius.pill,
                    backgroundColor: selected ? theme.violet : 'transparent',
                  }}
                >
                  <AppText
                    style={{
                      fontSize: 12.5,
                      fontWeight: '800',
                      color: selected ? theme.bg : theme.muted,
                    }}
                  >
                    {option.label}
                  </AppText>
                </View>
              </Squish>
            );
          })}
        </View>
      </View>

      <Row
        title="Reduce motion"
        hint="the add ritual becomes a crossfade — the reward, without the flight"
      >
        <Toggle value={reduceMotion} onToggle={() => setReduceMotion(!reduceMotion)} />
      </Row>

      <Row title="Sharing defaults" hint="new lists start as “friends can see it”">
        <AppText tone="muted" style={{ fontSize: 11, fontWeight: '700' }}>
          Friends
        </AppText>
      </Row>

      <Row title="Price-drop alerts" hint="we’ll tell you when a shiny gets cheaper">
        <AppText tone="muted" style={{ fontSize: 11, fontWeight: '700' }}>
          On
        </AppText>
      </Row>

      <AppText tone="muted" style={{ fontSize: 10.5, textAlign: 'center' }}>
        Secret stash and secret shinies never show. To anyone.
      </AppText>

      {/* Onboarding is otherwise a one-way door, and there are two good reasons
          to go back through it: you are demoing the app to someone, or you want
          your own account back afterwards. */}
      <Squish
        onPress={() => {
          startOver();
          closeSheet();
        }}
      >
        <View
          style={{
            borderWidth: 2,
            borderColor: brand.pink,
            borderRadius: layout.radius.chip,
            paddingVertical: 11,
            alignItems: 'center',
            gap: 2,
          }}
        >
          <AppText style={{ fontSize: 13, fontWeight: '800', color: brand.pink }}>
            {demoContent ? 'Back to the start' : 'Start over'}
          </AppText>
          <AppText tone="muted" style={{ fontSize: 10.5 }}>
            {demoContent
              ? 'you’re looking at the demo account, not yours'
              : `deletes ${profile.name}’s lists and shinies, and asks again`}
          </AppText>
        </View>
      </Squish>
    </BottomSheet>
  );
}

function Row({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: theme.inset,
        borderRadius: layout.radius.chip,
        paddingHorizontal: 14,
        paddingVertical: 11,
      }}
    >
      <View style={{ flex: 1 }}>
        <AppText style={{ fontSize: 13, fontWeight: '700' }}>{title}</AppText>
        <AppText tone="muted" style={{ fontSize: 10.5 }}>
          {hint}
        </AppText>
      </View>
      {children}
    </View>
  );
}
