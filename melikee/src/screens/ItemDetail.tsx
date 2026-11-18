/**
 * One shiny: its photo on its own card, then the name, price and where to buy
 * it, then the few things gifters should know. Price-drop alerts are off the
 * page for now (prices aren't re-checked yet).
 */
import { useState } from 'react';
import { Linking, ScrollView, View } from 'react-native';

import { listAccent, listById, useApp, visWord } from '@/store/useApp';
import { brand, palette } from '@/theme/tokens';
import { Chevron, Share, Sparkle } from '@/ui/icons';
import { Appear, Spin } from '@/ui/motion';
import { Card, Field, LimeButton, LimeFill, PhotoBox, T, Tap, Toggle } from '@/ui/primitives';

/** Round, dark buttons that stay visible on any photo, white or dark. */
const photoButton = { position: 'absolute' as const, top: 12, width: 38, height: 38, borderRadius: 19, backgroundColor: 'rgba(12,12,12,0.62)', alignItems: 'center' as const, justifyContent: 'center' as const };

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
        <T size={14} w={700}>
          That shiny’s gone.
        </T>
        <Tap onPress={back}>
          <T size={12.5} w={700} color={palette.vio}>
            Go back
          </T>
        </Tap>
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
        <View style={{ marginTop: 8, marginHorizontal: 14, borderRadius: 22, overflow: 'hidden' }}>
          <PhotoBox uri={item.image} fallback={item.photo} label="no photo yet" fit={item.pending ? 'cover' : 'contain'} style={{ height: 300 }} />
          <Tap onPress={back} accessibilityLabel="Back" style={[photoButton, { left: 12 }]}>
            <Chevron size={20} strokeWidth={2} color={brand.white} />
          </Tap>
          {list.vis !== 'me' ? (
            <Tap onPress={() => openSheet({ type: 'share', listId: list.id })} accessibilityLabel={`Share ${list.name}`} style={[photoButton, { right: 12 }]}>
              <Share size={16} color={brand.white} />
            </Tap>
          ) : null}
        </View>

        <View style={{ paddingTop: 18, paddingHorizontal: 20, gap: 6 }}>
          <Tap onPress={() => openSheet({ type: 'vis', listId: list.id })} accessibilityLabel={`${list.name}, ${visWord(list.vis)}. Change who sees it`} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'flex-start' }}>
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: listAccent(list) }} />
            <T size={12} w={600} color={palette.muted}>
              {list.name} · {visWord(list.vis)} ▾
            </T>
          </Tap>
          <T size={24} w={800} style={{ letterSpacing: -0.48, lineHeight: 29 }}>
            {item.name}
          </T>
        </View>

        <View style={{ paddingTop: 12, paddingHorizontal: 20, gap: 16 }}>
          {item.pending ? (
            <Card border={palette.lime66} style={{ paddingVertical: 12, paddingHorizontal: 14, gap: 10 }}>
              {item.suggest ? (
                <>
                  <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                    <PhotoBox uri={item.suggest.image} label="" style={{ width: 46, height: 46, borderRadius: 10 }} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T size={11} w={700} color={palette.limeText} style={{ letterSpacing: 0.66 }}>
                        WE THINK WE FOUND IT
                      </T>
                      <T size={13.5} w={700} style={{ marginTop: 2 }}>
                        {item.suggest.name}
                      </T>
                      <T size={11.5} color={palette.muted}>
                        {item.suggest.price} · {item.suggest.store} · {item.url && !item.query ? 'from your link' : 'matched for you'}
                      </T>
                    </View>
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8 }}>
                    <LimeButton
                      label="Yes, that's it"
                      size={13}
                      pad={10}
                      flex
                      onPress={() => {
                        const sg = item.suggest!;
                        updateItem(item.id, { ...sg, upc: sg.upc ?? '—', pending: false, suggest: null, alert: true, checkedAt: Date.now() });
                        showToast(`Matched — ${sg.name}`);
                      }}
                    />
                    <Tap onPress={fix} style={{ flex: 1, paddingVertical: 10, borderRadius: 999, borderWidth: 1, borderColor: palette.vio55, alignItems: 'center' }}>
                      <T size={13} w={700}>
                        No, let me pick
                      </T>
                    </Tap>
                  </View>
                </>
              ) : (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Spin period={1400}>
                    <Sparkle size={14} color={brand.lime} />
                  </Spin>
                  <View style={{ flex: 1 }}>
                    <T size={12.5} w={600}>
                      Still matching. We’ll ping you when we find it.
                    </T>
                    <T size={11} color={palette.muted}>
                      Gifters see “still choosing” until then.
                    </T>
                  </View>
                  <Tap onPress={fix}>
                    <T size={12} w={700} color={palette.vio}>
                      Pick it myself
                    </T>
                  </Tap>
                </View>
              )}
            </Card>
          ) : (
            <View style={{ gap: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <T size={22} w={800} color={palette.limeText}>
                  {item.price}
                </T>
                <T size={13} color={palette.muted}>
                  at {item.store}
                </T>
                {stores.length > 1 ? (
                  <Tap onPress={() => setCompare((x) => !x)} accessibilityState={{ expanded: compare }}>
                    <T size={13} w={700} color={palette.vio}>
                      · {compare ? 'hide stores' : `${stores.length - 1} more ${stores.length === 2 ? 'store' : 'stores'}`}
                    </T>
                  </Tap>
                ) : null}
              </View>
              {compare ? (
                <Card style={{ paddingVertical: 2, paddingHorizontal: 14 }}>
                  {stores.map((st, i) => (
                    <Tap key={st.store + i} onPress={() => open(st.url, st.store)} accessibilityLabel={`Open at ${st.store}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: i < stores.length - 1 ? 1 : 0, borderBottomColor: palette.vio22 }}>
                      <T size={13} w={600}>
                        {st.store}
                      </T>
                      <T size={13} w={700} color={st.best ? palette.limeText : palette.muted}>
                        {st.price}
                      </T>
                    </Tap>
                  ))}
                </Card>
              ) : null}
              <Tap onPress={() => open(item.url)}>
                <LimeFill style={{ paddingVertical: 13, alignItems: 'center' }}>
                  <T size={14} w={800} color={brand.limeInk}>
                    Open at {item.store}
                  </T>
                </LimeFill>
              </Tap>
            </View>
          )}


          <T size={11} w={700} color={palette.muted} style={{ letterSpacing: 0.66, marginBottom: -8, marginTop: 4 }}>
            FOR GIFTERS
          </T>
          <Card style={{ paddingTop: 2, paddingBottom: 4, paddingHorizontal: 14 }}>
            <Tap onPress={() => updateItem(item.id, { star: !item.star })} accessibilityRole="switch" accessibilityState={{ checked: !!item.star }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.vio22 }}>
              <T size={17} color={item.star ? brand.lime : palette.muted}>
                ★
              </T>
              <View style={{ flex: 1 }}>
                <T size={13} w={700}>
                  Really want this
                </T>
                <T size={11} color={palette.muted}>
                  gifters see it at the top
                </T>
              </View>
              <Toggle on={!!item.star} />
            </Tap>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: palette.vio22 }}>
              <T size={12} color={palette.muted} style={{ width: 82 }}>
                Size / color
              </T>
              <Field value={item.size ?? ''} onChangeText={(v) => updateItem(item.id, { size: v })} placeholder="e.g. 8.5, black" style={{ flex: 1, minWidth: 0, paddingVertical: 8, paddingHorizontal: 10 }} />
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9 }}>
              <T size={12} color={palette.muted} style={{ width: 82 }}>
                Note
              </T>
              <Field value={item.note ?? ''} onChangeText={(v) => updateItem(item.id, { note: v })} placeholder="e.g. not the pink one" style={{ flex: 1, minWidth: 0, paddingVertical: 8, paddingHorizontal: 10 }} />
            </View>
          </Card>

          <View style={{ flexDirection: 'row', gap: 22, justifyContent: 'center', paddingTop: 6 }}>
            <Tap onPress={fix}>
              <T size={12} w={700} color={palette.vio}>
                Wrong product?
              </T>
            </Tap>
            <Tap
              onPress={() => {
                removeItem(item.id);
                back();
                showToast('Nice — marked as got');
              }}
            >
              <T size={12} w={700} color={palette.muted}>
                Got it ✓
              </T>
            </Tap>
            <Tap
              onPress={() => {
                removeItem(item.id);
                back();
                showToast(`Removed from ${list.name}`);
              }}
            >
              <T size={12} w={700} color={brand.pink}>
                Remove
              </T>
            </Tap>
          </View>
          <T size={11} color={palette.muted} style={{ textAlign: 'center', marginTop: -6 }}>
            added {item.added}
          </T>
        </View>
      </ScrollView>
    </Appear>
  );
}
