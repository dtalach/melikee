/**
 * A friend's list, from the gifter's side.
 *
 * Dibs are secret: claiming one tells the other gifters, never the wisher.
 * The header count drops as items get claimed, which is the quiet urgency that
 * gets gifts bought before the birthday.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Dock } from '@/components/Dock';
import { useGoToTab } from '@/hooks/useGoToTab';
import { ChevronLeftIcon } from '@/ui/icons';
import { RiseIn } from '@/ui/motion';
import { AppText, Avatar, Button, Photo, Squish } from '@/ui/primitives';
import { layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { avaList } from '@/data/seed';
import { useAppStore } from '@/store/useAppStore';

export default function FriendListRoute() {
  const theme = useTheme();
  const router = useRouter();
  const goToTab = useGoToTab();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();

  const friend = useAppStore((s) => s.friends.find((f) => f.id === id));
  const dibs = useAppStore((s) => s.friendDibs);
  const toggleFriendDibs = useAppStore((s) => s.toggleFriendDibs);

  // Only one friend has a browsable list in this build's fixtures.
  const list = id === avaList.friendId ? avaList : null;
  const remaining = list ? list.items.filter((item) => !dibs[item.id]).length : 0;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <RiseIn style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingTop: insets.top + 14,
            paddingHorizontal: 18,
            paddingBottom: 10,
          }}
        >
          <Squish onPress={() => router.back()} hitSlop={10}>
            <ChevronLeftIcon size={20} color={theme.muted} />
          </Squish>
          <Avatar initial={friend?.initial ?? list?.initial ?? '?'} size={34} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={{ fontSize: 20, fontWeight: '800' }}>
              {list?.listName ?? `${friend?.name ?? 'Their'} list`}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 11 }}>
              {list
                ? `birthday in ${list.daysAway} days · ${remaining} shinies up for dibs`
                : 'nothing shared with you yet'}
            </AppText>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 2,
            paddingBottom: layout.dockClearance,
            gap: 9,
          }}
        >
          {list?.items.map((item) => {
            const claimed = !!dibs[item.id];
            return (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11,
                  backgroundColor: theme.card,
                  borderWidth: 2,
                  borderColor: claimed ? theme.lime66 : theme.violet44,
                  borderRadius: layout.radius.card,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                }}
              >
                <Photo style={{ width: 46, height: 46 }} radius={layout.radius.tile} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText style={{ fontSize: 13, fontWeight: '800', lineHeight: 16 }}>
                    {item.name}
                  </AppText>
                  <AppText tone="lime" style={{ fontSize: 11.5, fontWeight: '700', marginTop: 2 }}>
                    {item.price}
                  </AppText>
                </View>
                <Button
                  label={claimed ? 'Yours 🤫' : 'Call dibs'}
                  variant={claimed ? 'lime' : 'chip'}
                  size="sm"
                  onPress={() => toggleFriendDibs(item.id)}
                />
              </View>
            );
          })}

          <View
            style={{
              backgroundColor: theme.inset,
              borderRadius: layout.radius.chip,
              paddingHorizontal: 14,
              paddingVertical: 11,
            }}
          >
            <AppText tone="muted" style={{ fontSize: 11, textAlign: 'center' }}>
              Dibs are secret — {list?.owner ?? 'they'} will never know it was you.
            </AppText>
          </View>
        </ScrollView>
      </RiseIn>

      <Dock onSelect={goToTab} onShutter={() => goToTab('camera')} />
    </View>
  );
}
