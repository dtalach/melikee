/**
 * The gifter page — melikee.app/maya.
 *
 * What grandma opens: a plain link, no account, no download, no teen styling.
 * It is still unmistakably MeLikee (wordmark, star, lilac) because the people
 * who land here are the app's best growth channel — but calm, big-typed and
 * one action per item.
 *
 * It carries its own light brand surface in both app themes, so it looks the
 * same to a visitor as it does in preview.
 */
import { useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

import { SparkleIcon } from '@/ui/icons';
import { AppText, Squish } from '@/ui/primitives';
import { brand, gifter, layout } from '@/theme/tokens';
import { meProfile, useAppStore } from '@/store/useAppStore';

export default function GifterPageRoute() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { list: listParam } = useLocalSearchParams<{ handle: string; list?: string }>();

  const listId = listParam ?? 'w';
  const list = useAppStore((s) => s.lists.find((l) => l.id === listId));
  // Secrets never leave the app, whoever holds the link.
  const items = useAppStore((s) =>
    s.items.filter((i) => i.listId === listId && !i.secret && !i.pending),
  );
  const note = useAppStore((s) => s.notes[listId]);
  const dibs = useAppStore((s) => s.gifterDibs);
  const toggleGifterDibs = useAppStore((s) => s.toggleGifterDibs);

  const inPreview = router.canGoBack();
  const title = listId === 'w' ? 'wishlist' : (list?.name ?? 'wishlist');

  return (
    <View style={{ flex: 1, backgroundColor: gifter.bg }}>
      {/* Dark status-bar text, so it stays legible on the cream page. */}
      <StatusBar style="dark" />

      {inPreview ? (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            paddingTop: insets.top + 9,
            paddingHorizontal: 16,
            paddingBottom: 9,
            backgroundColor: gifter.bar,
            borderBottomWidth: 1,
            borderBottomColor: gifter.barEdge,
          }}
        >
          <Squish onPress={() => router.back()} hitSlop={8}>
            <AppText style={{ fontSize: 11, fontWeight: '800', color: gifter.violet }}>
              ✕ Exit preview
            </AppText>
          </Squish>
          <AppText
            style={{ flex: 1, textAlign: 'right', fontSize: 10, fontWeight: '700', color: gifter.muted }}
          >
            what gifters see — a link, no app
          </AppText>
        </View>
      ) : null}

      <ScrollView contentContainerStyle={{ paddingBottom: Math.max(30, insets.bottom + 20) }}>
        <View
          style={{
            paddingTop: inPreview ? 20 : insets.top + 20,
            paddingHorizontal: 22,
            paddingBottom: 6,
            alignItems: 'center',
            gap: 9,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
            <SparkleIcon size={13} color={gifter.violet} />
            <AppText style={{ fontSize: 12, fontWeight: '800', color: gifter.violet }}>
              MeLikee
            </AppText>
          </View>

          <LinearGradient
            colors={[brand.pink, gifter.violet]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={{ width: 58, height: 58, borderRadius: 29, padding: 2.5 }}
          >
            <View
              style={{
                flex: 1,
                borderRadius: 27,
                backgroundColor: gifter.card,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <AppText style={{ fontSize: 21, fontWeight: '800', color: gifter.violet }}>
                {meProfile.initial}
              </AppText>
            </View>
          </LinearGradient>

          <AppText
            style={{ fontSize: 21, fontWeight: '800', letterSpacing: -0.42, color: gifter.text }}
          >
            {meProfile.name}’s {title}
          </AppText>

          {/* The note the owner wrote — what makes this a message, not a list. */}
          {note ? (
            <View
              style={{
                backgroundColor: gifter.card,
                borderWidth: 1,
                borderColor: gifter.barEdge,
                borderRadius: layout.radius.chip,
                paddingHorizontal: 14,
                paddingVertical: 10,
                maxWidth: 280,
              }}
            >
              <AppText style={{ fontSize: 12.5, lineHeight: 19, color: gifter.note }}>
                “{note}”
              </AppText>
            </View>
          ) : null}

          <AppText style={{ fontSize: 10.5, fontWeight: '600', color: gifter.muted }}>
            birthday {meProfile.birthday} · prices checked today
          </AppText>
        </View>

        <View style={{ paddingHorizontal: 18, paddingTop: 12, gap: 9 }}>
          {items.map((item) => {
            const claimed = !!dibs[item.id];
            return (
              <View
                key={item.id}
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 11,
                  backgroundColor: gifter.card,
                  borderWidth: 1,
                  borderColor: claimed ? gifter.cardEdgeDibsed : gifter.cardEdge,
                  borderRadius: layout.radius.card,
                  paddingHorizontal: 12,
                  paddingVertical: 10,
                  boxShadow: '0 2px 8px rgba(45,36,71,0.06)',
                }}
              >
                <View
                  style={{
                    width: 46,
                    height: 46,
                    borderRadius: layout.radius.tile,
                    backgroundColor: gifter.photo,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AppText style={{ fontSize: 8, color: gifter.muted }}>photo</AppText>
                </View>

                <View style={{ flex: 1, minWidth: 0 }}>
                  <AppText
                    style={{ fontSize: 13, fontWeight: '800', lineHeight: 16, color: gifter.text }}
                  >
                    {item.name}
                  </AppText>
                  <AppText style={{ fontSize: 11, marginTop: 2, color: gifter.muted }}>
                    {item.price} · {item.store}
                  </AppText>
                </View>

                <Squish onPress={() => toggleGifterDibs(item.id)}>
                  <View
                    style={{
                      backgroundColor: claimed ? gifter.violetWash : brand.lime,
                      borderWidth: 1.5,
                      borderColor: claimed ? gifter.cardEdgeDibsed : 'transparent',
                      borderRadius: layout.radius.pill,
                      paddingHorizontal: 13,
                      paddingVertical: 7,
                    }}
                  >
                    <AppText
                      style={{
                        fontSize: 11.5,
                        fontWeight: '800',
                        color: claimed ? gifter.violet : brand.limeInk,
                      }}
                    >
                      {claimed ? 'Dibs yours ✓' : 'Call dibs'}
                    </AppText>
                  </View>
                </Squish>
              </View>
            );
          })}

          <View
            style={{
              backgroundColor: gifter.bar,
              borderRadius: layout.radius.chip,
              paddingHorizontal: 14,
              paddingVertical: 11,
            }}
          >
            <AppText
              style={{ fontSize: 11, lineHeight: 16.5, textAlign: 'center', color: gifter.muted }}
            >
              Dibs are a secret between gifters — {meProfile.name} never sees what’s claimed. Buy it
              anywhere you like.
            </AppText>
          </View>

          {/* The growth card: this page is where non-users meet the product. */}
          <View
            style={{
              marginTop: 6,
              backgroundColor: gifter.card,
              borderWidth: 1,
              borderColor: gifter.cardEdge,
              borderRadius: layout.radius.card,
              paddingHorizontal: 16,
              paddingVertical: 16,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <AppText
              style={{ fontSize: 15, fontWeight: '800', textAlign: 'center', color: gifter.text }}
            >
              Got wishes of your own?
            </AppText>
            <AppText
              style={{ fontSize: 12, lineHeight: 18, textAlign: 'center', color: gifter.muted }}
            >
              Snap anything you see and MeLikee remembers it for you — then share the list with
              whoever’s asking what you want.
            </AppText>
            <View
              style={{
                backgroundColor: gifter.violet,
                borderRadius: layout.radius.pill,
                paddingHorizontal: 20,
                paddingVertical: 11,
                marginTop: 2,
              }}
            >
              <AppText style={{ fontSize: 13, fontWeight: '800', color: '#ffffff' }}>
                Make my wishlist — it’s free
              </AppText>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
