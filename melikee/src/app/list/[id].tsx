/**
 * A list, as a shelf.
 *
 * The shelf grid was chosen over the ledger because seeing your collection at
 * a glance is the point; each card taps into a focused item view.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, View } from 'react-native';
import { useTopInset } from '@/hooks/useTopInset';

import { Dock } from '@/components/Dock';
import { useGoToTab } from '@/hooks/useGoToTab';
import { ChevronLeftIcon } from '@/ui/icons';
import { RiseIn } from '@/ui/motion';
import { AppText, Button, Photo, Squish } from '@/ui/primitives';
import { layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { shinies, useAppStore, visibilityLabel } from '@/store/useAppStore';

export default function ListDetailRoute() {
  const theme = useTheme();
  const router = useRouter();
  const goToTab = useGoToTab();
  const topInset = useTopInset();
  const { id } = useLocalSearchParams<{ id: string }>();

  const list = useAppStore((s) => s.lists.find((l) => l.id === id));
  // Selectors must return a stable reference: building a new array on every
  // read makes useSyncExternalStore see a change each render and loop.
  const allItems = useAppStore((s) => s.items);
  const items = useMemo(() => allItems.filter((i) => i.listId === id), [allItems, id]);
  const openSheet = useAppStore((s) => s.openSheet);

  if (!list) return null;

  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <RiseIn style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingTop: topInset + 14,
            paddingHorizontal: 18,
            paddingBottom: 10,
          }}
        >
          <Squish onPress={() => router.back()} hitSlop={10}>
            <ChevronLeftIcon size={20} color={theme.muted} />
          </Squish>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText style={{ fontSize: 20, fontWeight: '800' }}>{list.name}</AppText>
            <AppText tone="muted" style={{ fontSize: 11 }}>
              {shinies(items.length)} · {visibilityLabel(list.visibility)}
            </AppText>
          </View>
          <Button
            label="Share"
            variant="violet"
            size="sm"
            onPress={() => openSheet({ kind: 'share', listId: list.id })}
          />
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingHorizontal: 16,
            paddingTop: 2,
            paddingBottom: layout.dockClearance,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 11,
            alignContent: 'flex-start',
          }}
        >
          {items.map((item) => (
            <Squish
              key={item.id}
              onPress={() => router.push({ pathname: '/item/[id]', params: { id: item.id } })}
              style={{ width: '48%' }}
            >
              <View
                style={{
                  backgroundColor: theme.card,
                  borderWidth: 2,
                  borderColor: item.secret ? theme.violet99 : theme.violet44,
                  borderRadius: layout.radius.card,
                  overflow: 'hidden',
                }}
              >
                {item.secret ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 6,
                      right: 6,
                      zIndex: 1,
                      backgroundColor: theme.violet,
                      borderRadius: 5,
                      paddingHorizontal: 7,
                      paddingVertical: 2,
                    }}
                  >
                    <AppText style={{ fontSize: 9, fontWeight: '800', color: theme.bg }}>
                      secret
                    </AppText>
                  </View>
                ) : null}
                <Photo uri={item.photoUri} style={{ height: 96 }} />
                <View style={{ paddingHorizontal: 11, paddingVertical: 9 }}>
                  <AppText style={{ fontSize: 12, fontWeight: '700', lineHeight: 15.6 }}>
                    {item.name}
                  </AppText>
                  <AppText tone="lime" style={{ fontSize: 12, fontWeight: '800', marginTop: 3 }}>
                    {item.pricing === 'working'
                      ? 'checking…'
                      : item.pricing === 'failed'
                        ? '—'
                        : item.price}
                  </AppText>
                </View>
              </View>
            </Squish>
          ))}

          {items.length === 0 ? (
            <AppText
              tone="muted"
              style={{ width: '100%', fontSize: 12, textAlign: 'center', paddingVertical: 40, lineHeight: 18 }}
            >
              Nothing here yet. Tap the button below and snap the first one.
            </AppText>
          ) : null}
        </ScrollView>
      </RiseIn>

      <Dock onSelect={goToTab} onShutter={() => goToTab('camera')} />
    </View>
  );
}
