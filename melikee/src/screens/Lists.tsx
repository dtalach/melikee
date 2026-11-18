import { ScrollView, View } from 'react-native';

import { listAccent, listDays, shinies, useApp, visibleLists, visWord, type AppState } from '@/store/useApp';
import { brand, palette } from '@/theme/tokens';
import { Share } from '@/ui/icons';
import { Appear } from '@/ui/motion';
import { LimePill, T, Tap } from '@/ui/primitives';
import { XMAS_GREEN } from '@/ui/gift';
import { BoardCover, BoardWrap, coverShots, isXmasList, VisIcon } from './shared';

export function Lists() {
  const state = useApp((s) => s);
  const lists = visibleLists(state);
  const go = useApp((s) => s.go);
  const openSheet = useApp((s) => s.openSheet);
  const noItems = state.items.length === 0;

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: 16, paddingHorizontal: 22, paddingBottom: 110, gap: 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
          <T size={38} w={300} style={{ flex: 1, letterSpacing: -1.2 }}>
            Lists
          </T>
          <LimePill label="+ New list" onPress={() => openSheet({ type: 'newList' })} />
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 22 }}>
          {lists.map((l) => (
            <ListBoard key={l.id} s={state} id={l.id} onOpen={() => go({ name: 'list', id: l.id })} onShare={() => openSheet({ type: 'share', listId: l.id })} onVis={() => openSheet({ type: 'vis', listId: l.id })} onDate={() => openSheet({ type: 'bday' })} />
          ))}
        </View>
        {noItems ? (
          <T size={13} color={palette.muted} style={{ paddingVertical: 6, lineHeight: 20 }}>
            You start with these four. Snap your first shiny and it lands in My wants — make more lists for anything else.
          </T>
        ) : null}
      </ScrollView>
    </Appear>
  );
}

/** A list as a Pinterest-style board: a photo cover, its name, and a line about it. */
function ListBoard({ s, id, onOpen, onShare, onVis, onDate }: { s: AppState; id: string; onOpen: () => void; onShare: () => void; onVis: () => void; onDate: () => void }) {
  const l = s.lists.find((x) => x.id === id)!;
  const its = s.items.filter((i) => i.list === l.id);
  const days = listDays(s, l);
  const acc = listAccent(l);
  const xmas = isXmasList(l);
  const overlay = { position: 'absolute' as const, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.92)' };
  return (
    <View style={{ width: '48%', gap: 8 }}>
      <Tap onPress={onOpen} accessibilityLabel={`${l.name}, ${shinies(its.length)}`}>
        <BoardCover shots={coverShots(its)} accent={acc} initial={l.name[0]} initialInk={l.id === 'w' ? brand.limeInk : brand.white}>
          {xmas ? <BoardWrap /> : null}
          {days != null ? (
            <Tap onPress={l.isBirthday ? onDate : onOpen} accessibilityLabel={`${l.name} in ${days} days`} style={{ position: 'absolute', top: 7, left: 7, backgroundColor: l.isBirthday ? brand.pink : xmas ? XMAS_GREEN : 'rgba(255,255,255,0.92)', borderRadius: 999, paddingVertical: 3, paddingHorizontal: 9 }}>
              <T size={11} w={500} color={l.isBirthday || xmas ? brand.white : palette.text}>
                {days === 0 ? 'today!' : days === 1 ? '1 day' : `${days} days`}
              </T>
            </Tap>
          ) : null}
          {l.vis !== 'me' ? (
            <Tap onPress={onShare} accessibilityLabel={`Share ${l.name}`} style={[overlay, { top: 6, right: 6, width: 30, height: 30, alignItems: 'center', justifyContent: 'center' }]}>
              <Share color={palette.text} />
            </Tap>
          ) : null}
        </BoardCover>
      </Tap>
      <View style={{ gap: 2, paddingHorizontal: 2 }}>
        <T size={15} numberOfLines={1} onPress={onOpen}>
          {l.name}
        </T>
        <T size={12} color={palette.muted}>
          {shinies(its.length)}
        </T>
        <Tap onPress={onVis} accessibilityLabel={`Who sees it: ${visWord(l.vis)}. Change`} style={{ flexDirection: 'row', alignItems: 'center', gap: 5, alignSelf: 'flex-start', paddingVertical: 2 }}>
          <VisIcon vis={l.vis} color={palette.muted} />
          <T size={12} color={palette.muted} numberOfLines={1} style={{ flexShrink: 1 }}>
            {visWord(l.vis)}
          </T>
        </Tap>
      </View>
    </View>
  );
}

