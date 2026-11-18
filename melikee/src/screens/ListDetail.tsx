import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { priceValue } from '@/lib/match';
import { listById, useApp, visSummary } from '@/store/useApp';
import type { Item } from '@/store/types';
import { palette } from '@/theme/tokens';
import { Appear } from '@/ui/motion';
import { BackHeader, GhostButton, OptionPill, PhotoBox, T, Tap } from '@/ui/primitives';
import { VisIcon } from './shared';

export type SortKey = 'star' | 'new' | 'price';
export const SORTS: [SortKey, string][] = [
  ['star', 'Really want'],
  ['new', 'Newest'],
  ['price', 'Price'],
];

export function sortItems<I extends { star?: boolean; price: string }>(items: I[], by: SortKey, newest: (i: I) => number) {
  return items.slice().sort((a, b) => {
    if (by === 'price') return priceValue(a.price) - priceValue(b.price);
    if (by === 'new') return newest(b) - newest(a);
    return (b.star ? 1 : 0) - (a.star ? 1 : 0);
  });
}

export function SortRow({ by, onPick, note }: { by: SortKey; onPick: (k: SortKey) => void; note: string }) {
  return (
    <View style={{ paddingHorizontal: 22, paddingBottom: 12, flexDirection: 'row', gap: 16, alignItems: 'center' }}>
      {SORTS.map(([k, l]) => (
        <OptionPill key={k} label={l} on={by === k} onPress={() => onPick(k)} />
      ))}
      {/* The ★ badge on each tile says it already; the note stays for screen readers. */}
      <View accessible accessibilityLabel={note} />
    </View>
  );
}

export function ListDetail({ id }: { id: string }) {
  const s = useApp((st) => st);
  const list = listById(s, id);
  const [by, setBy] = useState<SortKey>('star');
  const items = sortItems(
    s.items.filter((i) => i.list === list.id),
    by,
    (i: Item) => i.createdAt,
  );

  return (
    <Appear style={{ flex: 1 }}>
      <View style={{ paddingTop: 14, paddingHorizontal: 22, paddingBottom: 12 }}>
        <BackHeader
          title={list.name}
          onBack={s.back}
          sub={
            <Tap
              onPress={() => s.openSheet({ type: 'vis', listId: list.id })}
              accessibilityLabel="Who sees this list"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 32 }}
            >
              <VisIcon vis={list.vis} size={12} color={palette.muted} />
              <T size={13} color={palette.muted} style={{ textDecorationLine: 'underline' }}>
                {visSummary(s, list)}
              </T>

            </Tap>
          }
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {list.vis !== 'me' ? <GhostButton label="Share" size={12} pad={6} onPress={() => s.openSheet({ type: 'share', listId: list.id })} /> : null}
              <Tap onPress={() => s.openSheet({ type: 'listSettings', listId: list.id })} accessibilityLabel="List settings" style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
                <T size={18} color={palette.text}>
                  ⋯
                </T>
              </Tap>
            </View>
          }
        />
      </View>
      <SortRow by={by} onPick={setBy} note="★ = really want" />
      <ScrollView contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 22, paddingBottom: 110, flexDirection: 'row', flexWrap: 'wrap', columnGap: 12, rowGap: 22 }}>
        <Tap
          onPress={() => s.openCamera({ dest: list.id })}
          style={{ width: '47.5%', aspectRatio: 1, alignSelf: 'flex-start', backgroundColor: palette.inset, borderRadius: 6, alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <T size={28} w={300} color={palette.text} style={{ lineHeight: 30 }}>
            +
          </T>
          <T size={13} color={palette.soft} style={{ textAlign: 'center', paddingHorizontal: 8 }}>
            Add to {list.name}
          </T>
        </Tap>
        {items.map((it) => (
          <Tap key={it.id} onPress={() => s.go({ name: 'item', id: it.id })} style={{ width: '47.5%', gap: 8 }}>
            <View style={{ borderRadius: 6, overflow: 'hidden' }}>
              <PhotoBox uri={it.image} fallback={it.photo} fit={it.pending ? 'cover' : 'contain'} light style={{ aspectRatio: 1 }} />
              {it.star ? (
                <View style={{ position: 'absolute', top: 7, left: 7, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
                  <T size={11} w={500} color={palette.text}>
                    ★ Really want
                  </T>
                </View>
              ) : null}
            </View>
            <View style={{ gap: 2 }}>
              <T size={14} numberOfLines={2} style={{ lineHeight: 19 }}>
                {it.name}
              </T>
              <T size={14} w={500} color={it.pending ? palette.muted : palette.text}>
                {it.pending ? 'still matching' : it.price}
              </T>
              {!it.pending ? (
                <T size={13} color={palette.muted} numberOfLines={1}>
                  {[it.store, it.size].filter(Boolean).join(' · ')}
                </T>
              ) : null}
            </View>
          </Tap>
        ))}
      </ScrollView>
    </Appear>
  );
}
