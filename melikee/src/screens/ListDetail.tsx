import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { priceValue } from '@/lib/match';
import { listById, useApp, visSummary } from '@/store/useApp';
import type { Item } from '@/store/types';
import { brand, palette } from '@/theme/tokens';
import { Chevron } from '@/ui/icons';
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
    <View style={{ paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', gap: 6, alignItems: 'center' }}>
      {SORTS.map(([k, l]) => (
        <OptionPill key={k} label={l} on={by === k} onPress={() => onPick(k)} />
      ))}
      <T size={11} color={palette.muted} style={{ marginLeft: 'auto' }}>
        {note}
      </T>
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
      <View style={{ paddingTop: 14, paddingHorizontal: 18, paddingBottom: 10 }}>
        <BackHeader
          title={list.name}
          onBack={s.back}
          sub={
            <Tap
              onPress={() => s.openSheet({ type: 'vis', listId: list.id })}
              accessibilityLabel="Who sees this list"
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: palette.vio44, borderRadius: 999, paddingVertical: 4, paddingLeft: 9, paddingRight: 10 }}
            >
              <VisIcon vis={list.vis} size={12} />
              <T size={12} w={600} color={palette.soft}>
                {visSummary(s, list)}
              </T>
              <Chevron dir="down" size={10} strokeWidth={2} color={palette.soft} />
            </Tap>
          }
          right={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              {list.vis !== 'me' ? <GhostButton label="Share" size={12} pad={6} onPress={() => s.openSheet({ type: 'share', listId: list.id })} /> : null}
              <Tap onPress={() => s.openSheet({ type: 'listSettings', listId: list.id })} accessibilityLabel="List settings" style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }}>
                <T size={18} w={700} color={palette.muted}>
                  ⋯
                </T>
              </Tap>
            </View>
          }
        />
      </View>
      <SortRow by={by} onPick={setBy} note="★ = really want" />
      <ScrollView contentContainerStyle={{ paddingTop: 2, paddingHorizontal: 16, paddingBottom: 110, flexDirection: 'row', flexWrap: 'wrap', gap: 11 }}>
        <Tap
          onPress={() => s.openCamera({ dest: list.id })}
          style={{ width: '48.4%', minHeight: 150, borderWidth: 1.5, borderStyle: 'dashed', borderColor: palette.vio55, borderRadius: 16, alignItems: 'center', justifyContent: 'center', gap: 6 }}
        >
          <T size={26} color={palette.soft} style={{ lineHeight: 28 }}>
            +
          </T>
          <T size={12} w={700} color={palette.soft} style={{ textAlign: 'center', paddingHorizontal: 8 }}>
            Add to {list.name}
          </T>
        </Tap>
        {items.map((it) => (
          <Tap key={it.id} onPress={() => s.go({ name: 'item', id: it.id })} style={{ width: '48.4%', backgroundColor: palette.card, borderWidth: 1, borderColor: it.pending ? palette.lime66 : palette.vio33, borderRadius: 16, overflow: 'hidden' }}>
            <View>
              <PhotoBox uri={it.image} fallback={it.photo} fit={it.pending ? 'cover' : 'contain'} style={{ aspectRatio: 1 }} />
              {it.star ? (
                <View style={{ position: 'absolute', top: 8, left: 8, backgroundColor: 'rgba(12,12,12,0.72)', borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
                  <T size={11} w={800} color={brand.lime}>
                    ★ Really want
                  </T>
                </View>
              ) : null}
            </View>
            <View style={{ paddingTop: 9, paddingHorizontal: 11, paddingBottom: 11, gap: 2 }}>
              <T size={13} w={700} numberOfLines={2} style={{ lineHeight: 17 }}>
                {it.name}
              </T>
              <T size={14} w={800} color={it.pending ? palette.muted : palette.limeText}>
                {it.pending ? 'still matching' : it.price}
              </T>
              {!it.pending ? (
                <T size={12} color={palette.muted} numberOfLines={1}>
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
