/**
 * The focused item card.
 *
 * One shiny, with everything a gift decision needs: price against three
 * stores, freshness, UPC and provenance — plus the two day-one actions the
 * design review asked for, "got it already" and remove.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { LinearGradient } from 'expo-linear-gradient';
import { ScrollView, View } from 'react-native';
import { useTopInset } from '@/hooks/useTopInset';

import { ChevronLeftIcon, ShareIcon } from '@/ui/icons';
import { RiseIn } from '@/ui/motion';
import { AppText, Button, Card, Photo, Squish, Sticker } from '@/ui/primitives';
import { priceFreshness } from '@/services/productMatch';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { useAppStore } from '@/store/useAppStore';

export default function ItemDetailRoute() {
  const theme = useTheme();
  const router = useRouter();
  const topInset = useTopInset();
  const { id } = useLocalSearchParams<{ id: string }>();

  const item = useAppStore((s) => s.items.find((i) => i.id === id));
  const list = useAppStore((s) => s.lists.find((l) => l.id === item?.listId));
  const removeItem = useAppStore((s) => s.removeItem);
  const markGotIt = useAppStore((s) => s.markGotIt);

  if (!item) return null;

  // The comparison rows used to be invented from the item's own price. That
  // was fine against a scripted matcher and is not fine next to a real one — a
  // made-up price sitting under a true one is the kind of lie a gift decision
  // gets made on. Now the card shows the stores the lookup actually found, and
  // shows nothing when it only found one.
  const comparisons = item.otherStores ?? [];

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: 40 }}
    >
      <RiseIn>
        <View style={{ height: 200 }}>
          <LinearGradient
            colors={[theme.photo2, theme.bg]}
            style={{ position: 'absolute', inset: 0 }}
          />
          {item.photoUri ? (
            <Photo uri={item.photoUri} style={{ position: 'absolute', inset: 0 }} />
          ) : null}

          <Squish
            onPress={goBack}
            style={{ position: 'absolute', left: 18, top: topInset + 12 }}
            hitSlop={10}
          >
            <ChevronLeftIcon size={22} color={theme.text} />
          </Squish>

          <View style={{ position: 'absolute', left: 20, right: 20, bottom: 12, gap: 6 }}>
            <Sticker>{list?.name ?? 'My wants'}</Sticker>
            <AppText style={{ fontSize: 22, fontWeight: '800', letterSpacing: -0.44 }}>
              {item.name}
            </AppText>
          </View>
        </View>

        <View style={{ paddingHorizontal: 18, paddingTop: 14, gap: 13 }}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <AppText tone="lime" style={{ fontSize: 26, fontWeight: '800' }}>
              {item.price}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 12 }}>
              {item.pending
                ? 'still matching'
                : `${item.store} · ${priceFreshness(item.checkedAt)}`}
            </AppText>
            {item.secret ? (
              <View
                style={{
                  backgroundColor: theme.violet,
                  borderRadius: 6,
                  paddingHorizontal: 9,
                  paddingVertical: 3,
                }}
              >
                <AppText style={{ fontSize: 10, fontWeight: '800', color: theme.bg }}>
                  secret — only you
                </AppText>
              </View>
            ) : null}
          </View>

          {!item.pending && comparisons.length ? (
            <Card border={theme.violet66}>
              <View style={{ paddingHorizontal: 14 }}>
                <StoreRow store={item.store} price={item.price} highlight />
                {comparisons.map((row) => (
                  <StoreRow key={row.storeName} store={row.storeName} price={row.price} />
                ))}
              </View>
            </Card>
          ) : null}

          <View style={{ flexDirection: 'row', gap: 14 }}>
            <AppText tone="muted" style={{ fontSize: 11 }}>
              UPC {item.upc}
            </AppText>
            <AppText tone="muted" style={{ fontSize: 11 }}>
              added {item.provenance}
            </AppText>
          </View>

          <View style={{ flexDirection: 'row', gap: 8 }}>
            <Button
              label={`Open at ${item.store}`}
              size="lg"
              style={{ flex: 1 }}
              onPress={() =>
                // A real lookup hands back the actual product page. Search is
                // only the fallback for items that predate it, or came from a
                // friend's feed rather than a shop.
                Linking.openURL(
                  item.buyUrl ??
                    `https://www.google.com/search?q=${encodeURIComponent(`${item.name} ${item.store}`)}`,
                ).catch(() => undefined)
              }
            />
            <View
              style={{
                width: 44,
                borderWidth: 2,
                borderColor: theme.violet66,
                borderRadius: layout.radius.pill,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <ShareIcon size={16} color={theme.violet} />
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 22, justifyContent: 'center', paddingTop: 4 }}>
            <Squish
              onPress={() => {
                markGotIt(item.id);
                goBack();
              }}
              hitSlop={6}
            >
              <AppText tone="muted" style={{ fontSize: 12, fontWeight: '800' }}>
                Got it already ✓
              </AppText>
            </Squish>
            <Squish
              onPress={() => {
                removeItem(item.id);
                goBack();
              }}
              hitSlop={6}
            >
              <AppText style={{ fontSize: 12, fontWeight: '800', color: brand.pink }}>
                Remove
              </AppText>
            </Squish>
          </View>
        </View>
      </RiseIn>
    </ScrollView>
  );
}

function StoreRow({
  store,
  price,
  highlight,
}: {
  store: string;
  price: string;
  highlight?: boolean;
}) {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 9,
        borderBottomWidth: 1,
        borderBottomColor: theme.violet22,
      }}
    >
      <AppText style={{ fontSize: 13 }}>{store}</AppText>
      <AppText
        tone={highlight ? 'lime' : 'muted'}
        style={{ fontSize: 13, fontWeight: '800' }}
      >
        {price}
      </AppText>
    </View>
  );
}
