import { ScrollView, View } from 'react-native';

import { listAccent, listDays, shinies, useApp, visibleLists, visWord, type AppState } from '@/store/useApp';
import { brand, palette } from '@/theme/tokens';
import { Share } from '@/ui/icons';
import { Appear } from '@/ui/motion';
import { Card, LimePill, T, Tap } from '@/ui/primitives';
import { ListCover, VisIcon } from './shared';

export function Lists() {
  const state = useApp((s) => s);
  const lists = visibleLists(state);
  const go = useApp((s) => s.go);
  const openSheet = useApp((s) => s.openSheet);
  const noItems = state.items.length === 0;

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 18, paddingBottom: 110, gap: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <T size={26} w={800} style={{ flex: 1, letterSpacing: -0.78 }}>
            Your lists
          </T>
          <LimePill label="+ New list" onPress={() => openSheet({ type: 'newList' })} />
        </View>
        {lists.map((l) => (
          <ListRow key={l.id} s={state} id={l.id} onOpen={() => go({ name: 'list', id: l.id })} onShare={() => openSheet({ type: 'share', listId: l.id })} onVis={() => openSheet({ type: 'vis', listId: l.id })} onDate={() => openSheet({ type: 'bday' })} />
        ))}
        {noItems ? (
          <T size={12} color={palette.muted} style={{ textAlign: 'center', paddingVertical: 6, paddingHorizontal: 20, lineHeight: 18 }}>
            You start with these four. Snap your first shiny and it lands in My wants — make more lists for anything else.
          </T>
        ) : null}
      </ScrollView>
    </Appear>
  );
}

function ListRow({ s, id, onOpen, onShare, onVis, onDate }: { s: AppState; id: string; onOpen: () => void; onShare: () => void; onVis: () => void; onDate: () => void }) {
  const l = s.lists.find((x) => x.id === id)!;
  const its = s.items.filter((i) => i.list === l.id);
  const drops = its.filter((i) => i.drop);
  const days = listDays(s, l);
  const acc = listAccent(l);
  return (
    <Card onPress={onOpen} style={{ padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
      <ListCover accent={acc} count={its.length} initial={l.name[0]} initialInk={l.id === 'w' ? brand.limeInk : brand.white} />
      <View style={{ flex: 1, minWidth: 0, gap: 4 }}>
        <T size={14} w={800}>
          {l.name}
        </T>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
          <Tap onPress={onVis} accessibilityLabel={`Sharing: ${visWord(l.vis)}`} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: palette.vio44, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
            <VisIcon vis={l.vis} />
            <T size={11} w={600} color={palette.soft}>
              {visWord(l.vis)}
            </T>
          </Tap>
          {days != null ? (
            <Tap onPress={l.isBirthday ? onDate : undefined} accessibilityLabel={`${l.name} in ${days} days`} style={{ backgroundColor: l.isBirthday ? brand.pink : acc, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8 }}>
              <T size={11} w={800} color={l.isBirthday ? brand.white : brand.limeInk}>
                {days === 0 ? 'today!' : days === 1 ? '1 day' : `${days} days`}
              </T>
            </Tap>
          ) : null}
          <T size={11} color={palette.muted}>
            {shinies(its.length)}
          </T>
          {drops.length ? (
            <T size={11} w={700} color={palette.limeText}>
              ↓ {drops[0].drop} price drop
            </T>
          ) : null}
        </View>
      </View>
      {l.vis !== 'me' ? (
        <Tap onPress={onShare} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: palette.vio55, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12 }}>
          <Share color={palette.text} />
          <T size={11.5} w={700}>
            Share
          </T>
        </Tap>
      ) : null}
    </Card>
  );
}
