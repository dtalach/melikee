/**
 * One shiny: its photo on its own card, then the name, price and where to buy
 * it, then the few things gifters should know. Price-drop alerts are off the
 * page for now (prices aren't re-checked yet).
 */
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';

import { listById, useApp, visWord } from '@/store/useApp';
import { brand, palette } from '@/theme/tokens';
import { Chevron, Share, Sparkle } from '@/ui/icons';
import { Appear, Spin } from '@/ui/motion';
import { Card, Field, LimeButton, PhotoBox, SectionLabel, T, Tap, TextLink, Toggle } from '@/ui/primitives';

/** Round white buttons that stay visible on any photo. */
const photoButton = { position: 'absolute' as const, top: 12, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.94)', alignItems: 'center' as const, justifyContent: 'center' as const, boxShadow: '0 1px 4px rgba(0,0,0,0.12)' };

export function ItemDetail({ id }: { id: number }) {
  const item = useApp((s) => s.items.find((i) => i.id === id));
  const list = useApp((s) => (item ? listById(s, item.list) : undefined));
  const back = useApp((s) => s.back);
  const updateItem = useApp((s) => s.updateItem);
  const removeItem = useApp((s) => s.removeItem);
  const openSheet = useApp((s) => s.openSheet);
  const showToast = useApp((s) => s.showToast);
  const [compare, setCompare] = useState(false);

  if (!item || !list) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <T size={22} w={300}>
          That shiny’s gone.
        </T>
        <TextLink label="Go back" onPress={back} />
      </View>
    );
  }

  const fix = () => {
    // A saved photo has no name to find near matches for yet: go straight to typing it.
    if (item.pending && !item.query) {
      useApp.getState().openCamera();
      useApp.getState().setCapture({ phase: 'type', typeQ: '', fixItem: item.id });
      return;
    }
    void useApp.getState().openAlternates(item.id);
  };
  // Only stores the search actually saw. Sample shinies carry just their own.
  const stores = [{ store: item.store, price: item.price, url: item.url, best: true }, ...(item.others ?? []).map((x) => ({ ...x, best: false }))];
  const open = (url?: string, store = item.store) => {
    if (url) Linking.openURL(url).catch(() => showToast(`Couldn’t open ${store}`));
    else showToast(`No link saved for ${store}`);
  };

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={{ marginTop: 8, marginHorizontal: 22, borderRadius: 6, overflow: 'hidden' }}>
          <PhotoBox uri={item.image} fallback={item.photo} label="no photo yet" fit={item.pending ? 'cover' : 'contain'} light style={{ aspectRatio: 1 }} />
          <Tap onPress={back} accessibilityLabel="Back" style={[photoButton, { left: 12 }]}>
            <Chevron size={18} strokeWidth={1.4} color={palette.text} />
          </Tap>
          {list.vis !== 'me' ? (
            <Tap onPress={() => openSheet({ type: 'share', listId: list.id })} accessibilityLabel={`Share ${list.name}`} style={[photoButton, { right: 12 }]}>
              <Share size={16} color={palette.text} />
            </Tap>
          ) : null}
        </View>

        <View style={{ paddingTop: 20, paddingHorizontal: 22, gap: 6 }}>
          <Tap onPress={() => openSheet({ type: 'vis', listId: list.id })} accessibilityLabel={`${list.name}, ${visWord(list.vis)}. Change who sees it`} style={{ alignSelf: 'flex-start', minHeight: 32, justifyContent: 'center' }}>
            <SectionLabel>
              {list.name} · {visWord(list.vis)}
            </SectionLabel>
          </Tap>
          <T size={26} w={300} style={{ letterSpacing: -0.6, lineHeight: 32 }}>
            {item.name}
          </T>
        </View>

        <View style={{ paddingTop: 12, paddingHorizontal: 22, gap: 18 }}>
          {item.pending ? (
            <Card style={{ paddingVertical: 14, gap: 12 }}>
              {item.suggest ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <PhotoBox uri={item.suggest.image} label="" light style={{ width: 52, height: 52, borderRadius: 6 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <SectionLabel>We think we found it</SectionLabel>
                      <T size={14} style={{ marginTop: 3 }}>
                        {item.suggest.name}
                      </T>
                      <T size={13} color={palette.muted}>
                        {item.suggest.price} · {item.suggest.store} · {item.url && !item.query ? 'from your link' : 'matched for you'}
                      </T>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                    <LimeButton
                      label="Yes, that's it"
                      flex
                      onPress={() => {
                        const sg = item.suggest!;
                        updateItem(item.id, { ...sg, upc: sg.upc ?? '—', pending: false, suggest: null, alert: true, checkedAt: Date.now() });
                        showToast(`Matched — ${sg.name}`);
                      }}
                    />
                    <TextLink label="No, let me pick" onPress={fix} />
                  </View>
                </>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Spin period={1400}>
                    <Sparkle size={13} color={palette.text} />
                  </Spin>
                  <View style={{ flex: 1 }}>
                    <T size={14}>Still matching. We’ll ping you when we find it.</T>
                    <T size={13} color={palette.muted}>
                      Gifters see “still choosing” until then.
                    </T>
                  </View>
                  <TextLink label="Pick it myself" onPress={fix} />
                </View>
              )}
            </Card>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <T size={32} w={300} style={{ letterSpacing: -0.8 }}>
                  {item.price}
                </T>
                <T size={14} color={palette.muted}>
                  at {item.store}
                </T>
                {stores.length > 1 ? (
                  <Tap onPress={() => setCompare((x) => !x)} accessibilityState={{ expanded: compare }}>
                    <T size={14} color={palette.muted} style={{ textDecorationLine: 'underline' }}>
                      {compare ? 'hide stores' : `${stores.length - 1} more ${stores.length === 2 ? 'store' : 'stores'}`}
                    </T>
                  </Tap>
                ) : null}
              </View>
              {compare ? (
                <View>
                  {stores.map((st, i) => (
                    <Tap key={st.store + i} onPress={() => open(st.url, st.store)} accessibilityLabel={`Open at ${st.store}`} style={{ flexDirection: 'row', justifyContent: 'space-between', minHeight: 48, alignItems: 'center', borderTopWidth: 1, borderTopColor: palette.vio33 }}>
                      <T size={14}>{st.store}</T>
                      <T size={14} w={st.best ? 500 : 400} color={st.best ? palette.text : palette.muted}>
                        {st.price}
                      </T>
                    </Tap>
                  ))}
                </View>
              ) : null}
              <LimeButton label={`Open at ${item.store}`} onPress={() => open(item.url)} />
            </View>
          )}


          <SectionLabel style={{ marginBottom: -10, marginTop: 10 }}>For gifters</SectionLabel>
          <View>
            <Tap onPress={() => updateItem(item.id, { star: !item.star })} accessibilityRole="switch" accessibilityState={{ checked: !!item.star }} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, borderTopWidth: 1, borderTopColor: palette.vio33 }}>
              <View style={{ flex: 1 }}>
                <T size={14}>Really want this</T>
                <T size={13} color={palette.muted}>
                  gifters see it at the top
                </T>
              </View>
              <Toggle on={!!item.star} />
            </Tap>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: palette.vio33 }}>
              <SectionLabel style={{ width: 112 }}>Size / color</SectionLabel>
              <Field value={item.size ?? ''} onChangeText={(v) => updateItem(item.id, { size: v })} placeholder="e.g. 8.5, black" style={{ flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 12 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderTopWidth: 1, borderTopColor: palette.vio33 }}>
              <SectionLabel style={{ width: 112 }}>Note</SectionLabel>
              <Field value={item.note ?? ''} onChangeText={(v) => updateItem(item.id, { note: v })} placeholder="e.g. not the pink one" style={{ flex: 1, minWidth: 0, paddingVertical: 10, paddingHorizontal: 12 }} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 20, justifyContent: 'center', flexWrap: 'wrap', paddingTop: 4, borderTopWidth: 1, borderTopColor: palette.vio33 }}>
            {[
              { label: 'Wrong product?', color: palette.text, onPress: fix },
              {
                label: 'Got it ✓',
                color: palette.soft,
                onPress: () => {
                  removeItem(item.id);
                  back();
                  showToast('Nice — marked as got');
                },
              },
              {
                label: 'Remove',
                color: brand.pink,
                onPress: () => {
                  removeItem(item.id);
                  back();
                  showToast(`Removed from ${list.name}`);
                },
              },
            ].map((x) => (
              <TextLink key={x.label} label={x.label} color={x.color} onPress={x.onPress} />
            ))}
          </View>
          <T size={12} color={palette.muted} style={{ textAlign: 'center', marginTop: -10 }}>
            added {item.added}
          </T>
        </View>
      </ScrollView>
    </Appear>
  );
}
