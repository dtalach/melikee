import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ChevronRightIcon, GlobeIcon, LockIcon, ShareIcon } from '@/ui/icons';
import { RiseIn } from '@/ui/motion';
import { AppText, Button, Squish } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore, visibilityLabel } from '@/store/useAppStore';

export function ListsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const lists = useAppStore((s) => s.lists);
  const items = useAppStore((s) => s.items);
  const openSheet = useAppStore((s) => s.openSheet);

  /** A brand-new account: the starter lists exist, nothing's in them yet. */
  const empty = items.length === 0;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingHorizontal: 18,
        paddingBottom: layout.dockClearance,
        gap: 10,
      }}
    >
      <RiseIn style={{ gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <AppText style={{ flex: 1, fontSize: 26, fontWeight: '800', letterSpacing: -0.78 }}>
            Your lists
          </AppText>
          {/* Creation actions live top-right everywhere in the app. */}
          <Button label="+ New list" onPress={() => openSheet({ kind: 'newList' })} />
        </View>

        {lists.map((list) => {
          const count = items.filter((i) => i.listId === list.id).length;
          return (
            <Squish
              key={list.id}
              onPress={() => router.push({ pathname: '/list/[id]', params: { id: list.id } })}
            >
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  backgroundColor: theme.card,
                  borderWidth: 2,
                  borderColor: `${list.accent}66`,
                  borderRadius: layout.radius.card,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                }}
              >
                <View
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: layout.radius.tile,
                    backgroundColor: theme.deep,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText style={{ fontSize: 15, fontWeight: '800', color: theme.avatarText }}>
                    {list.name[0]}
                  </AppText>
                </View>

                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText style={{ fontSize: 14, fontWeight: '800' }}>{list.name}</AppText>
                    <VisibilityBadge list={list} />
                  </View>
                  <AppText tone="muted" style={{ fontSize: 11 }}>
                    {count} shinies · {visibilityLabel(list.visibility)}
                  </AppText>
                </View>

                {/* Per-list sharing — the route to the people without the app. */}
                <Squish onPress={() => openSheet({ kind: 'share', listId: list.id })}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 5,
                      backgroundColor: theme.chip,
                      borderWidth: 1.5,
                      borderColor: theme.violet55,
                      borderRadius: layout.radius.pill,
                      paddingHorizontal: 12,
                      paddingVertical: 6,
                    }}
                  >
                    <ShareIcon size={12} color={theme.limeText} />
                    <AppText tone="lime" style={{ fontSize: 11, fontWeight: '800' }}>
                      Share
                    </AppText>
                  </View>
                </Squish>

                <ChevronRightIcon size={14} color={theme.muted} />
              </View>
            </Squish>
          );
        })}

        {empty ? (
          <AppText
            tone="muted"
            style={{ fontSize: 12, textAlign: 'center', paddingHorizontal: 20, paddingVertical: 6, lineHeight: 18 }}
          >
            You start with these three. Snap your first shiny and it lands in My wants — make more
            lists for birthdays, holidays, whatever.
          </AppText>
        ) : null}
      </RiseIn>
    </ScrollView>
  );
}

/** Lists wear their visibility, so who-sees-what is never a guess. */
export function VisibilityBadge({
  list,
}: {
  list: { visibility: string; countdown?: string };
}) {
  const theme = useTheme();

  if (list.countdown) {
    return (
      <View
        style={{
          backgroundColor: brand.pink,
          borderRadius: 4,
          paddingHorizontal: 6,
          paddingVertical: 1,
        }}
      >
        <AppText style={{ fontSize: 9, fontWeight: '800', color: brand.pinkInk }}>
          {list.countdown}
        </AppText>
      </View>
    );
  }
  if (list.visibility === 'me') return <LockIcon size={11} color={theme.violet} />;
  if (list.visibility === 'friends') return <GlobeIcon size={11} color={brand.lime} />;
  return null;
}
