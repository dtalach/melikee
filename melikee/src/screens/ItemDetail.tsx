import { LinearGradient } from 'expo-linear-gradient';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';

import { ago } from '@/lib/dates';
import { alsoWant } from '@/store/seed';
import { listById, useApp, visWord } from '@/store/useApp';
import { brand, palette } from '@/theme/tokens';
import { Chevron, Share, Sparkle, TrendLine } from '@/ui/icons';
import { Appear, Spin } from '@/ui/motion';
import { Card, Field, LimeButton, LimeFill, PhotoBox, T, Tap, Toggle } from '@/ui/primitives';

export function ItemDetail({ id }: { id: number }) {
  const item = useApp((s) => s.items.find((i) => i.id === id));
  const list = useApp((s) => (item ? listById(s, item.list) : undefined));
  const back = useApp((s) => s.back);
  const updateItem = useApp((s) => s.updateItem);
  const removeItem = useApp((s) => s.removeItem);
  const openSheet = useApp((s) => s.openSheet);
  const showToast = useApp((s) => s.showToast);

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
  const checked = item.checkedAt ? `checked ${ago(item.checkedAt) === 'now' ? 'just now' : `${ago(item.checkedAt)} ago`}` : '';
  const open = (url?: string, store = item.store) => {
    if (url) Linking.openURL(url).catch(() => showToast(`Couldn’t open ${store}`));
    else showToast(`No link saved for ${store}`);
  };
  const also = alsoWant[item.id];

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <LinearGradient colors={[palette.ph2, palette.bg]} style={{ height: 200, alignItems: 'center', justifyContent: 'center' }}>
          {item.image || item.photo ? (
            <>
              <PhotoBox uri={item.image} fallback={item.photo} label="" fit={item.pending ? 'cover' : 'contain'} style={StyleSheet.absoluteFill} />
              <LinearGradient pointerEvents="none" colors={['rgba(18,18,18,0)', palette.bg]} locations={[0.35, 1]} style={StyleSheet.absoluteFill} />
            </>
          ) : (
            <T size={11} color={palette.muted}>
              photo
            </T>
          )}
          <Tap onPress={back} accessibilityLabel="Back" style={{ position: 'absolute', left: 14, top: 8, padding: 4 }}>
            <Chevron size={22} strokeWidth={1.5} color={palette.text} />
          </Tap>
          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 12, gap: 6, alignItems: 'flex-start' }}>
            <View style={{ backgroundColor: brand.lime, paddingVertical: 3, paddingHorizontal: 9, borderRadius: 6, transform: [{ rotate: '-2deg' }] }}>
              <T size={11} w={800} color={brand.limeInk}>
                {list.name}
              </T>
            </View>
            <T size={22} w={800} style={{ letterSpacing: -0.44 }}>
              {item.name}
            </T>
            <Tap onPress={() => openSheet({ type: 'vis', listId: list.id })} style={{ backgroundColor: 'rgba(20,16,31,0.45)', borderWidth: 1, borderColor: palette.vio44, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10 }}>
              <T size={11.5} w={600}>
                {list.name} · {visWord(list.vis)} ▾
              </T>
            </Tap>
          </View>
        </LinearGradient>

        <View style={{ paddingTop: 14, paddingHorizontal: 18, gap: 13 }}>
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
            <>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
                <T size={26} w={800} color={palette.limeText}>
                  {item.price}
                </T>
                <T size={12} color={palette.muted}>
                  {[`at ${item.store}`, stores.length > 1 ? `${stores.length - 1} more ${stores.length === 2 ? 'store' : 'stores'}` : '', checked].filter(Boolean).join(' · ')}
                </T>
                {list.vis === 'me' ? (
                  <View style={{ borderWidth: 1, borderColor: palette.vio55, paddingVertical: 2, paddingHorizontal: 9, borderRadius: 999 }}>
                    <T size={11} w={700} color={palette.soft}>
                      Private list
                    </T>
                  </View>
                ) : null}
              </View>
              <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
                {stores.map((st, i) => (
                  <Tap key={st.store + i} onPress={() => open(st.url, st.store)} accessibilityLabel={`Open at ${st.store}`} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: i < stores.length - 1 ? 1 : 0, borderBottomColor: palette.vio22 }}>
                    <T size={13} w={600}>
                      {st.store}
                    </T>
                    <T size={13} w={800} color={st.best ? palette.limeText : palette.muted}>
                      {st.price}
                    </T>
                  </Tap>
                ))}
              </Card>
              {/* Price history isn't tracked yet; only shinies with a known drop show it. */}
              {item.drop ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.inset, borderRadius: 12, paddingVertical: 9, paddingHorizontal: 12 }}>
                  <TrendLine color={palette.limeText} />
                  <T size={12} w={600} style={{ flex: 1 }}>
                    Down {item.drop} this month · lowest in 30 days
                  </T>
                </View>
              ) : null}
            </>
          )}

          {also ? (
            <Tap onPress={() => showToast('Opens who else wants it — tap a friend to see their list')} style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <View style={{ flexDirection: 'row' }}>
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: brand.pink, borderWidth: 2, borderColor: palette.bg }} />
                <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: palette.vio, borderWidth: 2, borderColor: palette.bg, marginLeft: -8 }} />
              </View>
              <T size={12} w={600} color={palette.soft}>
                {also}
              </T>
            </Tap>
          ) : null}

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
            {!item.pending ? (
              <Tap onPress={() => updateItem(item.id, { alert: item.alert === false })} accessibilityRole="switch" accessibilityState={{ checked: item.alert !== false }} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: palette.vio22 }}>
                <View style={{ flex: 1 }}>
                  <T size={13} w={700}>
                    Price drop alerts
                  </T>
                  <T size={11} color={palette.muted}>
                    when it dips below its 30-day high
                  </T>
                </View>
                <Toggle on={item.alert !== false} />
              </Tap>
            ) : null}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: palette.vio22 }}>
              <T size={12} color={palette.muted} style={{ width: 86 }}>
                Size / color
              </T>
              <Field value={item.size ?? ''} onChangeText={(v) => updateItem(item.id, { size: v })} placeholder="e.g. 8.5, black" style={{ flex: 1, minWidth: 0, paddingVertical: 8, paddingHorizontal: 10 }} />
            </View>
            <View style={{ gap: 6, paddingVertical: 10 }}>
              <T size={12} color={palette.muted}>
                Note for gifters
              </T>
              <Field value={item.note ?? ''} onChangeText={(v) => updateItem(item.id, { note: v })} placeholder="e.g. not the pink one" style={{ paddingVertical: 8, paddingHorizontal: 10 }} />
            </View>
          </Card>

          <View style={{ flexDirection: 'row', gap: 14 }}>
            <T size={11} color={palette.muted}>
              UPC {item.upc}
            </T>
            <T size={11} color={palette.muted}>
              added {item.added}
            </T>
          </View>

          {!item.pending ? (
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <Tap onPress={() => open(item.url)} style={{ flex: 1 }}>
                <LimeFill style={{ paddingVertical: 11, alignItems: 'center' }}>
                  <T size={13} w={800} color={brand.limeInk}>
                    Open at {item.store}
                  </T>
                </LimeFill>
              </Tap>
              {list.vis !== 'me' ? (
                <Tap onPress={() => openSheet({ type: 'share', listId: list.id })} accessibilityLabel={`Share ${list.name}`} style={{ width: 44, borderWidth: 1, borderColor: palette.vio33, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}>
                  <Share size={16} color={palette.vio} />
                </Tap>
              ) : null}
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 22, justifyContent: 'center', paddingTop: 4 }}>
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
                Got it already ✓
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
        </View>
      </ScrollView>
    </Appear>
  );
}
