/**
 * The filing tray — pattern 7b, "add-then-file".
 *
 * The add already happened: "Want it!" is one tap and the reward ritual plays
 * uninterrupted. This slides up afterwards for a few seconds offering Undo, a
 * move, or secrecy, then slides away on its own. Choice is optional, never a
 * gate.
 */
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { LockIcon } from '@/ui/icons';
import { SlideUp } from '@/ui/motion';
import { AppText, Chip, Eyebrow, Photo, Squish, Toggle } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore, visibilityLabel } from '@/store/useAppStore';

export function FilingTray() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  const filing = useAppStore((s) => s.filing);
  const items = useAppStore((s) => s.items);
  const lists = useAppStore((s) => s.lists);
  const tickFiling = useAppStore((s) => s.tickFiling);
  const undoFiledAdd = useAppStore((s) => s.undoFiledAdd);
  const moveFiledItem = useAppStore((s) => s.moveFiledItem);
  const toggleFiledSecret = useAppStore((s) => s.toggleFiledSecret);

  useEffect(() => {
    if (!filing) return;
    const timer = setInterval(tickFiling, 1000);
    return () => clearInterval(timer);
  }, [filing, tickFiling]);

  if (!filing) return null;

  const item = items.find((i) => i.id === filing.itemId);
  if (!item) return null;

  const list = lists.find((l) => l.id === item.listId);
  const otherLists = lists.filter((l) => l.id !== item.listId);

  return (
    <SlideUp
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 6,
      }}
    >
      <View
        style={{
          backgroundColor: theme.card,
          borderWidth: 2,
          borderBottomWidth: 0,
          borderColor: theme.violet66,
          borderTopLeftRadius: layout.radius.sheet,
          borderTopRightRadius: layout.radius.sheet,
          paddingHorizontal: 18,
          paddingTop: 14,
          paddingBottom: Math.max(24, insets.bottom + 10),
          gap: 12,
          boxShadow: `0 -10px 34px ${theme.isDark ? 'rgba(0,0,0,0.6)' : 'rgba(45,36,71,0.2)'}`,
        }}
      >
        {/* What just happened, and the escape hatch. */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
          <Photo
            uri={item.photoUri}
            style={{
              width: 44,
              height: 44,
              borderWidth: 1.5,
              borderColor: theme.violet44,
            }}
            radius={layout.radius.tile}
          />
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 13, fontWeight: '800' }}>
              Added to {list?.name ?? 'My wants'}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 11 }}>
              {item.secret ? 'secret — only you' : list ? visibilityLabel(list.visibility) : ''} ·{' '}
              {item.price}
            </AppText>
          </View>
          <Squish onPress={undoFiledAdd} hitSlop={10}>
            <AppText tone="violet" style={{ fontSize: 12, fontWeight: '800' }}>
              Undo
            </AppText>
          </Squish>
        </View>

        {/* Re-filing, without making the add conditional on it. */}
        {otherLists.length > 0 ? (
          <View style={{ gap: 7 }}>
            <Eyebrow>MOVE IT INSTEAD?</Eyebrow>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
              {otherLists.map((l) => (
                <Chip
                  key={l.id}
                  label={l.name}
                  onPress={() => moveFiledItem(l.id)}
                  trailing={
                    l.countdown ? (
                      <View
                        style={{
                          backgroundColor: brand.pink,
                          borderRadius: 4,
                          paddingHorizontal: 5,
                          paddingVertical: 1,
                        }}
                      >
                        <AppText style={{ fontSize: 9, fontWeight: '800', color: brand.pinkInk }}>
                          {l.countdown}
                        </AppText>
                      </View>
                    ) : l.visibility === 'me' ? (
                      <LockIcon size={11} color={theme.violet} />
                    ) : null
                  }
                />
              ))}
            </View>
          </View>
        ) : null}

        {/* Per-item secrecy — the quiet answer to "I don't want this seen". */}
        <Squish onPress={toggleFiledSecret}>
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: 10,
              backgroundColor: theme.inset,
              borderRadius: layout.radius.chip,
              paddingHorizontal: 14,
              paddingVertical: 10,
            }}
          >
            <LockIcon size={15} color={theme.violet} />
            <View style={{ flex: 1 }}>
              <AppText style={{ fontSize: 12, fontWeight: '700' }}>Make this one secret</AppText>
              <AppText tone="muted" style={{ fontSize: 10.5 }}>
                only you’ll see it, even on this list
              </AppText>
            </View>
            <Toggle value={item.secret} onToggle={toggleFiledSecret} />
          </View>
        </Squish>

        <AppText tone="muted" style={{ fontSize: 10.5, textAlign: 'center' }}>
          slides away in {filing.secondsLeft}s — the add already happened
        </AppText>
      </View>
    </SlideUp>
  );
}
