/**
 * Ideas: gift inspiration picked for this person. A scroll of photo cards,
 * each a specific product with a short reason it fits them, built from their
 * lists, sizes, age band, upcoming occasions, searches and reactions to
 * earlier ideas (see src/lib/ideas.ts and server/ideas.ts). "Want it" saves
 * to My wants; "Not for me" teaches the next batch.
 */
import { useEffect } from 'react';
import { ScrollView, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import type { Budget } from '@/lib/ideasContract';
import { IDEAS_STALE_MS, useApp, type IdeaCard } from '@/store/useApp';
import { palette } from '@/theme/tokens';
import { Close } from '@/ui/icons';
import { Appear, Pulse } from '@/ui/motion';
import { PhotoBox, T, Tap, TextLink } from '@/ui/primitives';

const BUDGETS: [Budget, string][] = [
  ['any', 'Any price'],
  ['under25', 'Under $25'],
  ['under50', 'Under $50'],
  ['under100', 'Under $100'],
  ['splurge', 'Splurge'],
];

export function Ideas() {
  const ideas = useApp((s) => s.ideas);
  const loading = useApp((s) => s.ideasLoading);
  const error = useApp((s) => s.ideasError);
  const hasWants = useApp((s) => s.items.length > 0);
  const loadIdeas = useApp((s) => s.loadIdeas);
  const setBudget = useApp((s) => s.setIdeaBudget);
  const cards = ideas.cards.filter((c) => c.state !== 'dismissed');

  useEffect(() => {
    const st = useApp.getState().ideas;
    if (!st.cards.length || Date.now() - st.at > IDEAS_STALE_MS) void loadIdeas();
  }, [loadIdeas]);

  // Near the bottom: fetch the next batch.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentSize.height - contentOffset.y - layoutMeasurement.height < 400 && cards.length && !loading && !error) void loadIdeas(true);
  };

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView onScroll={onScroll} scrollEventThrottle={200} contentContainerStyle={{ paddingTop: 10, paddingHorizontal: 22, paddingBottom: 120, gap: 16 }}>
        <View style={{ gap: 4 }}>
          <T size={38} w={300} style={{ letterSpacing: -1.2 }}>
            For you
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <T size={14} color={palette.muted} style={{ flex: 1, lineHeight: 20 }}>
              {ideas.themes.length ? `because you’re into ${ideas.themes.map((t) => t.name.toLowerCase()).join(' · ')}` : 'picked from your lists and what you search'}
            </T>
            <TextLink label="New ideas" onPress={() => void loadIdeas()} disabled={loading} />
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 18 }}>
          {BUDGETS.map(([b, label]) => {
            const on = ideas.budget === b;
            return (
              <Tap key={b} onPress={() => !on && setBudget(b)} accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected: on }} style={{ minHeight: 36, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: on ? palette.text : 'transparent' }}>
                <T size={12} w={on ? 500 : 400} color={on ? palette.text : palette.muted} style={{ letterSpacing: 1.4, textTransform: 'uppercase' }}>
                  {label}
                </T>
              </Tap>
            );
          })}
        </ScrollView>

        {!hasWants && !cards.length && !loading ? (
          <T size={13} color={palette.muted} style={{ paddingVertical: 6 }}>
            Add a few wants and these get a lot sharper.
          </T>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18 }}>
          {cards.map((c) => (
            <IdeaTile key={c.id} c={c} />
          ))}
          {loading ? [0, 1, 2, 3, 4, 5].slice(0, cards.length ? 2 : 6).map((i) => <SkeletonTile key={`s${i}`} />) : null}
        </View>

        {error ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 10 }}>
            <T size={12.5} color={palette.muted} style={{ textAlign: 'center' }}>
              {error}
            </T>
            <TextLink label="Try again" onPress={() => void loadIdeas(cards.length > 0)} />
          </View>
        ) : null}

        <T size={12} color={palette.muted} style={{ paddingTop: 8, lineHeight: 18 }}>
          Ideas come from your lists, sizes and what you search on MeLikee. Nothing from other apps or sites.
        </T>
      </ScrollView>
    </Appear>
  );
}

function IdeaTile({ c }: { c: IdeaCard }) {
  const want = useApp((s) => s.wantIdea);
  const dismiss = useApp((s) => s.dismissIdea);
  const wanted = c.state === 'wanted';
  return (
    <View style={{ width: '48%', gap: 8 }}>
      <View style={{ borderRadius: 6, overflow: 'hidden' }}>
        <PhotoBox uri={c.image} label="finding a photo…" labelSize={10} light style={{ aspectRatio: 1 }} />
        <Tap onPress={() => dismiss(c.id)} accessibilityLabel={`Not for me: ${c.name}`} style={{ position: 'absolute', top: 4, right: 4, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' }}>
            <Close size={9} strokeWidth={1.4} color={palette.text} />
          </View>
        </Tap>
      </View>
      <View style={{ gap: 3 }}>
        <T size={14} numberOfLines={2} style={{ lineHeight: 19 }}>
          {c.name}
        </T>
        <T size={13} color={palette.muted} numberOfLines={2} style={{ lineHeight: 18 }}>
          <T size={13} w={500} color={palette.text}>
            ~{c.price.replace(/^~/, '')}
          </T>{' '}
          · {c.why}
        </T>
      </View>
      <Tap onPress={() => want(c.id)} disabled={wanted} accessibilityLabel={wanted ? `${c.name} is in My wants` : `Want ${c.name}`} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
        <T size={13} w={500} color={wanted ? palette.muted : palette.text} style={wanted ? undefined : { textDecorationLine: 'underline' }}>
          {wanted ? 'In My wants ✓' : 'Want it'}
        </T>
      </Tap>
    </View>
  );
}

function SkeletonTile() {
  return (
    <View style={{ width: '48%' }}>
      <Pulse style={{ gap: 7 }}>
        <View style={{ aspectRatio: 1, borderRadius: 6, backgroundColor: palette.inset }} />
        <View style={{ height: 12, width: '80%', borderRadius: 3, backgroundColor: palette.inset }} />
        <View style={{ height: 10, width: '55%', borderRadius: 3, backgroundColor: palette.inset }} />
      </Pulse>
    </View>
  );
}
