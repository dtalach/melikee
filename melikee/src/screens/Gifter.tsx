/**
 * What gifters see: a plain, paper-toned page that opens from a link with no
 * app. Inside the app it's a preview with an "Exit preview" bar; at
 * /g/<handle> it's the real thing.
 *
 * Rules (spec): the wisher never sees dibs; first dibs asks for a display
 * name shown to other gifters only; one claim per shiny; pending shinies read
 * "Still choosing"; after dibs, "Buy at {store} →".
 */
import { useState } from 'react';
import { Image, Linking, ScrollView, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { label } from '@/lib/dates';
import { otherGifters } from '@/store/seed';
import { listById, useApp } from '@/store/useApp';
import { brand, font, gift } from '@/theme/tokens';
import { Sparkle } from '@/ui/icons';
import { Appear, SlideUp } from '@/ui/motion';
import { Avatar, LimeFill, T, Tap } from '@/ui/primitives';

const NAME_CHIPS = ['Grandma', 'Mom', 'Dad', 'Aunt', 'A friend'];

export function GifterPage({ listId, preview, expired }: { listId: string; preview?: boolean; expired?: boolean }) {
  const insets = useSafeAreaInsets();
  const s = useApp((st) => st);
  const list = listById(s, listId);
  const [asking, setAsking] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const owner = s.profile.name;
  // A private list never reaches a gifter page.
  const dead = expired || list.vis === 'me';

  const items = s.items
    .filter((i) => i.list === list.id)
    .sort((a, b) => (b.star ? 1 : 0) - (a.star ? 1 : 0));

  const confirmName = () => {
    const nm = draft.trim();
    if (!nm || asking == null) return;
    s.setGifterName(nm);
    if (!s.gifterDibs[asking]) s.toggleGifterDibs(asking);
    setAsking(null);
  };

  const joinCta = (title: string) => (
    <View style={{ marginTop: 6, backgroundColor: gift.text, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' }}>
      <View style={{ flex: 1 }}>
        <T size={13.5} w={800} color={gift.page}>
          {title}
        </T>
        <T size={11} color={gift.page} style={{ opacity: 0.8, marginTop: 2 }}>
          Free. Friends call dibs, nobody gets doubles.
        </T>
      </View>
      <Tap onPress={() => s.showToast('Opens the App Store — their list starts with one tap')} style={{ backgroundColor: brand.lime, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 999 }}>
        <T size={12} w={800} color={brand.limeInk}>
          Make mine
        </T>
      </Tap>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: gift.page, paddingTop: insets.top }}>
      {preview ? (
        <View style={{ paddingVertical: 9, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: gift.band, borderBottomWidth: 1, borderBottomColor: gift.bandLine }}>
          <Tap onPress={s.back}>
            <T size={11} w={700} color={gift.accent}>
              ✕ Exit preview
            </T>
          </Tap>
          <T size={11} w={600} color={gift.meta} style={{ flex: 1, textAlign: 'right' }}>
            what gifters see — a link, no app
          </T>
        </View>
      ) : null}

      {dead ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 10, paddingHorizontal: 36 }}>
          <T size={21} w={800} color={gift.text} style={{ textAlign: 'center', letterSpacing: -0.42 }}>
            This list link has expired
          </T>
          <T size={13} color={gift.body} style={{ textAlign: 'center', lineHeight: 19.5 }}>
            {owner}’s links stop working after the occasion, or when a new one is made. Ask {owner} for the latest.
          </T>
          {joinCta('Make your own list')}
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ paddingBottom: 30 + insets.bottom }}>
          <Appear style={{ paddingTop: 20, paddingHorizontal: 22, paddingBottom: 6, gap: 9, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Sparkle size={13} color={gift.accent} />
              <T size={12} w={700} color={gift.accent} style={{ letterSpacing: 0.24 }}>
                MeLikee
              </T>
            </View>
            <Avatar initial={owner[0]} size={58} ring={[brand.pink, gift.accent]} ringWidth={2.5} fill="#fff" color="#7a5fd0" gap="#fff" fontSize={21} />
            <T size={21} w={800} color={gift.text} style={{ letterSpacing: -0.42, textAlign: 'center' }}>
              {owner}’s {list.id === 'w' ? 'wishlist' : list.name}
            </T>
            {list.note ? (
              <View style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: gift.bandLine, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, maxWidth: 280 }}>
                <T size={12.5} w={600} color={gift.body} style={{ lineHeight: 19, textAlign: 'center' }}>
                  “{list.note}”
                </T>
              </View>
            ) : null}
            <T size={11} color={gift.meta}>
              birthday {label(s.profile.birthday)} · prices checked today
            </T>
            {s.gifterName ? (
              <T size={11} w={600} color={gift.body}>
                Calling dibs as <T size={11} w={800} color={gift.body}>{s.gifterName}</T> ·{' '}
                <T
                  size={11}
                  w={700}
                  color={gift.accent}
                  onPress={() => {
                    setDraft(s.gifterName);
                    s.setGifterName('');
                  }}
                >
                  change
                </T>
              </T>
            ) : null}
          </Appear>
          <View style={{ paddingTop: 12, paddingHorizontal: 18, gap: 9 }}>
            {items.map((i) => {
              const choosing = !!i.pending;
              const mine = !choosing && !!s.gifterDibs[i.id];
              const other = choosing ? null : otherGifters[i.id];
              const btn = choosing
                ? { label: 'Still choosing', bg: gift.band, fg: gift.meta, bd: 'transparent' }
                : other
                  ? { label: `${other} has it`, bg: gift.band, fg: gift.meta, bd: 'transparent' }
                  : mine
                    ? { label: 'Dibs yours ✓', bg: gift.fill, fg: gift.accent, bd: gift.accent66 }
                    : null;
              const meta = choosing ? 'still choosing the exact one' : [i.price, i.store, i.size].filter(Boolean).join(' · ');
              return (
                <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: '#fff', borderWidth: 1, borderColor: mine ? gift.accent66 : gift.rowLine, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, boxShadow: '0 2px 8px rgba(45,36,71,0.06)' }}>
                  <View style={{ width: 46, height: 46, borderRadius: 10, backgroundColor: i.image && !choosing ? '#fff' : gift.thumb, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                    {i.image && !choosing ? (
                      <Image source={{ uri: i.image }} resizeMode="contain" style={{ width: '100%', height: '100%' }} accessibilityIgnoresInvertColors />
                    ) : (
                      <T size={8} color={gift.meta}>
                        photo
                      </T>
                    )}
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T size={13} w={700} color={gift.text} style={{ lineHeight: 16 }}>
                      {(i.star ? '★ ' : '') + i.name}
                    </T>
                    <T size={11} color={gift.meta} style={{ marginTop: 2 }}>
                      {meta}
                    </T>
                    {i.note ? (
                      <T size={11} color={gift.body} style={{ fontStyle: 'italic', marginTop: 3 }}>
                        “{i.note}”
                      </T>
                    ) : null}
                    {mine ? (
                      <Tap onPress={() => (i.url ? Linking.openURL(i.url).catch(() => undefined) : s.showToast(`Find it at ${i.store}`))} style={{ marginTop: 4 }}>
                        <T size={11.5} w={700} color={gift.accent}>
                          Buy at {i.store} →
                        </T>
                      </Tap>
                    ) : null}
                  </View>
                  <Tap
                    disabled={choosing || !!other}
                    onPress={() => {
                      if (!mine && !s.gifterName) {
                        setDraft('');
                        setAsking(i.id);
                        return;
                      }
                      s.toggleGifterDibs(i.id);
                    }}
                  >
                    {btn ? (
                      <View style={{ backgroundColor: btn.bg, borderWidth: 1.5, borderColor: btn.bd, paddingVertical: 7, paddingHorizontal: 13, borderRadius: 999 }}>
                        <T size={11.5} w={800} color={btn.fg}>
                          {btn.label}
                        </T>
                      </View>
                    ) : (
                      <LimeFill style={{ paddingVertical: 8.5, paddingHorizontal: 14.5 }}>
                        <T size={11.5} w={800} color={brand.limeInk}>
                          Call dibs
                        </T>
                      </LimeFill>
                    )}
                  </Tap>
                </View>
              );
            })}
            <View style={{ backgroundColor: gift.band, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 14 }}>
              <T size={11} color={gift.meta} style={{ textAlign: 'center', lineHeight: 16.5 }}>
                Dibs are a secret between gifters — {owner} never sees what’s claimed. Buy it anywhere you like.
              </T>
            </View>
            {joinCta(`Want a list like ${owner}’s?`)}
          </View>
        </ScrollView>
      )}

      {asking != null ? (
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <Tap accessibilityLabel="Cancel" onPress={() => setAsking(null)} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(45,36,71,0.35)' }} />
          <SlideUp style={{ position: 'absolute', left: 0, right: 0, bottom: 0 }}>
            <View style={{ backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, paddingTop: 18, paddingHorizontal: 20, paddingBottom: 36 + insets.bottom, gap: 12, boxShadow: '0 -10px 30px rgba(45,36,71,0.2)' }}>
              <T size={17} w={800} color={gift.text}>
                Who’s calling dibs?
              </T>
              <T size={12} color={gift.body} style={{ lineHeight: 18 }}>
                Other gifters see your name so nobody doubles up. {owner} never does.
              </T>
              <TextInput
                value={draft}
                onChangeText={setDraft}
                placeholder="Your name"
                placeholderTextColor={gift.meta}
                autoFocus
                onSubmitEditing={confirmName}
                style={{ backgroundColor: gift.page, borderWidth: 1.5, borderColor: gift.bandLine, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13, fontSize: 14, fontFamily: font[600], color: gift.text }}
              />
              <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                {NAME_CHIPS.map((c) => (
                  <Tap key={c} onPress={() => setDraft(c)} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: gift.band }}>
                    <T size={12} w={600} color={gift.body}>
                      {c}
                    </T>
                  </Tap>
                ))}
              </View>
              <Tap onPress={confirmName} disabled={!draft.trim()} style={{ opacity: draft.trim() ? 1 : 0.45 }}>
                <LimeFill style={{ paddingVertical: 13, alignItems: 'center' }}>
                  <T size={14} w={800} color={brand.limeInk}>
                    Call dibs on {items.find((i) => i.id === asking)?.name ?? ''}
                  </T>
                </LimeFill>
              </Tap>
            </View>
          </SlideUp>
        </View>
      ) : null}
    </View>
  );
}
