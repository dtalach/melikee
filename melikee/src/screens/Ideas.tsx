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
import { useApp, type IdeaCard } from '@/store/useApp';
import { brand, palette } from '@/theme/tokens';
import { Close, Sparkle } from '@/ui/icons';
import { Appear, Twinkle } from '@/ui/motion';
import { PhotoBox, T, Tap } from '@/ui/primitives';

const BUDGETS: [Budget, string][] = [
  ['any', 'Any price'],
  ['under25', 'Under $25'],
  ['under50', 'Under $50'],
  ['under100', 'Under $100'],
  ['splurge', 'Splurge'],
];

/** A batch older than this is refreshed when the tab opens. */
const STALE_MS = 12 * 3600 * 1000;

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
    if (!st.cards.length || Date.now() - st.at > STALE_MS) void loadIdeas();
  }, [loadIdeas]);

  // Near the bottom: fetch the next batch.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
    if (contentSize.height - contentOffset.y - layoutMeasurement.height < 400 && cards.length && !loading && !error) void loadIdeas(true);
  };

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView onScroll={onScroll} scrollEventThrottle={200} contentContainerStyle={{ paddingTop: 12, paddingHorizontal: 16, paddingBottom: 120, gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 2 }}>
          <T size={26} w={800} style={{ letterSpacing: -0.78 }}>
            Ideas
          </T>
          <T size={12} color={palette.muted} style={{ flex: 1 }}>
            picked for you
          </T>
          <Tap onPress={() => void loadIdeas()} disabled={loading} accessibilityLabel="New ideas" style={{ borderWidth: 1, borderColor: palette.vio44, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 12, opacity: loading ? 0.5 : 1 }}>
            <T size={12} w={700}>
              New ideas
            </T>
          </Tap>
        </View>

        {ideas.themes.length ? (
          <T size={12} color={palette.muted} style={{ paddingHorizontal: 2, lineHeight: 17 }}>
            Because you’re into <T size={12} w={700} color={palette.soft}>{ideas.themes.map((t) => t.name.toLowerCase()).join(' · ')}</T>
          </T>
        ) : null}

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
          {BUDGETS.map(([b, label]) => {
            const on = ideas.budget === b;
            return (
              <Tap key={b} onPress={() => !on && setBudget(b)} accessibilityRole="button" accessibilityState={{ selected: on }} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: on ? brand.lime : palette.chip }}>
                <T size={12} w={700} color={on ? brand.limeInk : palette.soft}>
                  {label}
                </T>
              </Tap>
            );
          })}
        </ScrollView>

        {!hasWants && !cards.length && !loading ? (
          <T size={12} color={palette.muted} style={{ textAlign: 'center', paddingVertical: 6 }}>
            Add a few wants and these get a lot sharper.
          </T>
        ) : null}

        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 18 }}>
          {cards.map((c) => (
            <IdeaTile key={c.id} c={c} />
          ))}
          {loading ? [0, 1, 2, 3].slice(0, cards.length ? 2 : 4).map((i) => <SkeletonTile key={`s${i}`} />) : null}
        </View>

        {error ? (
          <View style={{ alignItems: 'center', gap: 8, paddingVertical: 10 }}>
            <T size={12.5} color={palette.muted} style={{ textAlign: 'center' }}>
              {error}
            </T>
            <Tap onPress={() => void loadIdeas(cards.length > 0)}>
              <T size={12.5} w={700} color={palette.vio}>
                Try again
              </T>
            </Tap>
          </View>
        ) : null}

        <T size={11} color={palette.muted} style={{ textAlign: 'center', paddingTop: 8, paddingHorizontal: 20, lineHeight: 16 }}>
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
    <View style={{ width: '48%', gap: 7 }}>
      <View style={{ borderRadius: 16, overflow: 'hidden' }}>
        <PhotoBox uri={c.image} label="finding a photo…" labelSize={10} style={{ aspectRatio: 1 }} />
        <Tap onPress={() => dismiss(c.id)} accessibilityLabel={`Not for me: ${c.name}`} style={{ position: 'absolute', top: 7, right: 7, width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(12,12,12,0.62)', alignItems: 'center', justifyContent: 'center' }}>
          <Close size={11} color={brand.white} />
        </Tap>
      </View>
      <View style={{ gap: 3, paddingHorizontal: 2 }}>
        <T size={13} w={700} numberOfLines={2} style={{ lineHeight: 17 }}>
          {c.name}
        </T>
        <T size={11.5} color={palette.muted} numberOfLines={2} style={{ lineHeight: 15 }}>
          <T size={11.5} w={800} color={palette.limeText}>
            ~{c.price.replace(/^~/, '')}
          </T>{' '}
          · {c.why}
        </T>
      </View>
      <Tap
        onPress={() => want(c.id)}
        disabled={wanted}
        accessibilityLabel={wanted ? `${c.name} is in My wants` : `Want ${c.name}`}
        style={{ alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: wanted ? palette.chip : brand.lime }}
      >
        {wanted ? null : <Sparkle size={10} color={brand.limeInk} />}
        <T size={12} w={800} color={wanted ? palette.muted : brand.limeInk}>
          {wanted ? 'In My wants ✓' : 'Want it'}
        </T>
      </Tap>
    </View>
  );
}

function SkeletonTile() {
  return (
    <View style={{ width: '48%', gap: 7 }}>
      <Twinkle period={1400}>
        <View style={{ aspectRatio: 1, borderRadius: 16, backgroundColor: palette.card }} />
      </Twinkle>
      <View style={{ height: 12, width: '80%', borderRadius: 6, backgroundColor: palette.card }} />
      <View style={{ height: 10, width: '55%', borderRadius: 5, backgroundColor: palette.card }} />
    </View>
  );
}
