/**
 * A friend's list, from the gifter's side inside the app: call dibs, chip in.
 * Dibs are secret from the wisher.
 */
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';

import { daysUntil, parseLabel, SOON_DAYS } from '@/lib/dates';
import { useApp } from '@/store/useApp';
import { brand, palette, ringSoon } from '@/theme/tokens';
import { Appear } from '@/ui/motion';
import { Avatar, BackHeader, PhotoBox, T, Tap } from '@/ui/primitives';
import { sortItems, SortRow, type SortKey } from './ListDetail';
import { coverShots, MiniBoard } from './shared';

export function FriendListScreen({ id }: { id: string }) {
  const list = useApp((s) => s.friendLists.find((l) => l.id === id));
  const friend = useApp((s) => s.friends.find((f) => f.id === list?.friendId));
  const dibs = useApp((s) => s.friendDibs);
  const allLists = useApp((s) => s.friendLists);
  const toggle = useApp((s) => s.toggleFriendDibs);
  const back = useApp((s) => s.back);
  const showToast = useApp((s) => s.showToast);
  const [by, setBy] = useState<SortKey>('star');

  if (!list || !friend) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <T size={14} w={700}>
          This list isn’t shared with you anymore.
        </T>
        <Tap onPress={back}>
          <T size={12.5} w={700} color={palette.vio}>
            Go back
          </T>
        </Tap>
      </View>
    );
  }

  // Birthday lists count down to their birthday; dated lists (Christmas) to their date.
  const when = list.isBirthday ? friend.birthday : parseLabel(list.date);
  const days = when ? daysUntil(when) : null;
  const left = list.items.filter((i) => !i.taken && !dibs[i.id] && !i.pending).length;
  const siblings = allLists.filter((l) => l.friendId === friend.id);
  const order = Object.fromEntries(list.items.map((i, n) => [i.id, n]));
  const items = sortItems(list.items, by, (i) => order[i.id]);

  return (
    <Appear style={{ flex: 1 }}>
      <View style={{ paddingTop: 14, paddingHorizontal: 18, paddingBottom: 10 }}>
        <BackHeader
          title={list.name}
          onBack={back}
          sub={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              {days != null ? (
                <View style={{ backgroundColor: brand.pink, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                  <T size={11} w={500} color={brand.white}>
                    {days === 0 ? 'today!' : `in ${days} days`}
                  </T>
                </View>
              ) : null}
              <T size={13} color={palette.muted}>
                {left} of {list.items.length} up for dibs
              </T>
            </View>
          }
          right={<Avatar initial={friend.initial} size={40} ring={days != null && days <= SOON_DAYS ? ringSoon : palette.deep} fontSize={14} />}
        />
      </View>
      {siblings.length > 1 ? (
        // All their lists as boards; the one you're on is outlined.
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flexGrow: 0 }} contentContainerStyle={{ gap: 12, paddingHorizontal: 22, paddingBottom: 14 }}>
          {siblings.map((l) => (
            <MiniBoard
              key={l.id}
              width={128}
              shots={coverShots(l.items)}
              accent={palette.inset}
              name={l.name}
              sub={`${l.items.length} ${l.items.length === 1 ? 'shiny' : 'shinies'}`}
              selected={l.id === list.id}
              label={`${friend.name}’s ${l.name}`}
              // Switch lists in place: Back still goes to wherever you came from.
              onPress={() => useApp.setState((st) => ({ stack: [...st.stack.slice(0, -1), { name: 'friendList', id: l.id }] }))}
            />
          ))}
        </ScrollView>
      ) : null}
      <SortRow by={by} onPick={setBy} note={`★ = ${friend.name} really wants`} />
      <ScrollView contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 22, paddingBottom: 110, flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 22 }}>
        {items.map((a) => {
          const mine = !!dibs[a.id];
          const taken = !!a.taken;
          const choosing = !!a.pending;
          return (
            <View key={a.id} style={{ width: '47.5%', gap: 8, opacity: taken ? 0.55 : 1 }}>
              <View style={{ borderRadius: 6, overflow: 'hidden' }}>
                <PhotoBox uri={a.image} label={choosing ? 'still choosing' : 'photo'} light style={{ aspectRatio: 1 }} />
                {a.star ? (
                  <View style={{ position: 'absolute', top: 7, left: 7, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                    <T size={11} w={500} color={palette.text}>
                      ★ Really wants
                    </T>
                  </View>
                ) : null}
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <T size={14} numberOfLines={2} style={{ lineHeight: 19 }}>
                  {a.name}
                </T>
                {!choosing ? (
                  <T size={14} w={500} color={palette.text}>
                    {a.price}
                  </T>
                ) : null}
                <T size={13} color={palette.muted} numberOfLines={1}>
                  {choosing ? 'still choosing the exact one' : a.store}
                </T>
              </View>
              <View>
                <Tap
                  disabled={taken || choosing}
                  accessibilityLabel={`${mine ? 'Drop dibs on' : 'Call dibs on'} ${a.name}`}
                  onPress={() => {
                    if (a.chipIn) {
                      showToast('Chip in — pick an amount, stays anonymous');
                      return;
                    }
                    void toggle(list.id, a.id);
                  }}
                  style={{ paddingVertical: 10, borderRadius: 999, alignItems: 'center', backgroundColor: taken || choosing ? palette.inset : mine ? palette.inset : palette.text }}
                >
                  <T size={13} w={500} color={taken || choosing ? palette.muted : mine ? palette.text : palette.bg}>
                    {choosing ? 'Still choosing' : taken ? `${a.takenBy ?? 'Someone'} has it` : mine ? 'Yours ✓' : a.chipIn ? 'Chip in' : 'Call dibs'}
                  </T>
                </Tap>
                {mine ? (
                  <Tap onPress={() => (a.url ? void Linking.openURL(a.url).catch(() => undefined) : showToast(`Find it at ${a.store}`))} style={{ alignItems: 'center', minHeight: 40, justifyContent: 'center' }}>
                    <T size={13} w={500} color={palette.text} style={{ textDecorationLine: 'underline' }}>
                      Buy at {a.store} →
                    </T>
                  </Tap>
                ) : null}
              </View>
            </View>
          );
        })}
        {items.length === 0 ? (
          <T size={14} color={palette.muted} style={{ width: '100%', paddingVertical: 16 }}>
            Nothing on this list yet.
          </T>
        ) : null}
        <View style={{ width: '100%', borderTopWidth: 1, borderTopColor: palette.vio33, paddingTop: 14 }}>
          <T size={12} color={palette.muted} style={{ textAlign: 'center' }}>
            Dibs are secret. {friend.name} will never know it was you.
          </T>
        </View>
      </ScrollView>
    </Appear>
  );
}
