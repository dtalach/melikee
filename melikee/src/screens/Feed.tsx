/**
 * The Feed: what your people want. Friends with a birthday coming lead the
 * row; a friend's birthday list gets a dibs card; then friends' recent adds,
 * then what's trending.
 */
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';

import { ago, daysUntil, SOON_DAYS } from '@/lib/dates';
import { trending } from '@/store/seed';
import { useApp } from '@/store/useApp';
import { brand, palette, ringSoon } from '@/theme/tokens';

import { Appear } from '@/ui/motion';
import { Avatar, DaysTag, LimeFill, PhotoBox, T, Tap } from '@/ui/primitives';
import { EmptyGlow } from './shared';

/** Friends' side of Home: their birthdays, their new wants, ideas everyone likes. */
export function Feed() {
  const friends = useApp((s) => s.friends);
  const feed = useApp((s) => s.feed);
  const friendLists = useApp((s) => s.friendLists);
  const friendDibs = useApp((s) => s.friendDibs);
  const go = useApp((s) => s.go);
  const openSheet = useApp((s) => s.openSheet);
  const wantToo = useApp((s) => s.wantToo);
  const showToast = useApp((s) => s.showToast);
  const openCamera = useApp((s) => s.openCamera);
  const runCapture = useApp((s) => s.runCapture);

  const people = friends.map((f) => ({ ...f, days: daysUntil(f.birthday) })).sort((a, b) => a.days - b.days);
  const empty = friends.length === 0;
  const byId = Object.fromEntries(friends.map((f) => [f.id, f]));

  // The soonest friend birthday with a list gets the dibs card.
  const bdayCard = people
    .filter((p) => p.days <= SOON_DAYS)
    .map((p) => ({ p, list: friendLists.find((l) => l.friendId === p.id && l.isBirthday) ?? friendLists.find((l) => l.friendId === p.id) }))
    .find((x) => x.list);
  const left = bdayCard?.list ? bdayCard.list.items.filter((i) => !i.taken && !friendDibs[i.id] && !i.pending).length : 0;
  const syncFriends = useApp((s) => s.syncFriends);
  useEffect(() => {
    void syncFriends();
  }, [syncFriends]);

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 110 }}>
        <View style={{ height: 6 }} />

        {empty ? (
          <EmptyGlow
            title={'Your Feed is quiet…\ntoo quiet.'}
            body="This is where your friends' wants show up — and where you'll call dibs on their birthday gifts."
            cta="Find your people"
            onCta={() => openSheet({ type: 'invite' })}
            icon="eye"
          />
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 18, paddingBottom: 14 }}>
              {people.map((p) => {
                const soon = p.days <= SOON_DAYS;
                const list = friendLists.find((l) => l.friendId === p.id);
                return (
                  <Tap
                    key={p.id}
                    onPress={() => (list ? go({ name: 'friendList', id: list.id }) : showToast(`${p.name}’s lists open here`))}
                    accessibilityLabel={soon ? `${p.name}, birthday in ${p.days} days` : p.name}
                    style={{ alignItems: 'center', gap: 5, width: 56 }}
                  >
                    <Avatar initial={p.initial} size={54} ringWidth={2.5} ring={soon ? ringSoon : palette.deep} fontSize={16} />
                    <T size={11} w={soon ? 800 : 600} color={soon ? brand.pink : palette.avt} numberOfLines={1}>
                      {soon ? `${p.days}d` : p.name}
                    </T>
                  </Tap>
                );
              })}
              <Tap onPress={() => openSheet({ type: 'invite' })} style={{ alignItems: 'center', gap: 5, width: 56 }}>
                <View style={{ width: 54, height: 54, borderRadius: 27, borderWidth: 1.5, borderStyle: 'dashed', borderColor: palette.vio66, alignItems: 'center', justifyContent: 'center' }}>
                  <T size={22} color={palette.muted}>
                    +
                  </T>
                </View>
                <T size={11} color={palette.muted}>
                  Invite
                </T>
              </Tap>
            </ScrollView>

            {bdayCard?.list ? (
              <View style={{ paddingHorizontal: 16, paddingBottom: 14 }}>
                <View style={{ backgroundColor: palette.card, borderWidth: 1, borderColor: palette.vio33, borderRadius: 18, padding: 14, gap: 12 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar initial={bdayCard.p.initial} size={36} ring={ringSoon} gap={palette.chip} fontSize={13} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T size={14} w={800}>
                        {bdayCard.list.name}
                      </T>
                      <T size={11.5} color={palette.muted}>
                        in {bdayCard.p.days} days · {left} of {bdayCard.list.items.length} still up for dibs
                      </T>
                    </View>
                    <DaysTag label={`${bdayCard.p.days}d`} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    {bdayCard.list.items.slice(0, 4).map((i) => (
                      <PhotoBox key={i.id} uri={i.image} label="" style={{ flex: 1, aspectRatio: 1, borderRadius: 10, alignItems: 'flex-start', justifyContent: 'flex-end', padding: 5 }}>
                        <T size={11} w={700}>
                          {i.price}
                        </T>
                      </PhotoBox>
                    ))}
                  </View>
                  <Tap onPress={() => go({ name: 'friendList', id: bdayCard.list!.id })} style={{ backgroundColor: brand.pink, borderRadius: 999, paddingVertical: 11, alignItems: 'center' }}>
                    <T size={13} w={800} color={brand.white}>
                      See {bdayCard.p.name}’s list · call dibs
                    </T>
                  </Tap>
                </View>
              </View>
            ) : null}

            <View style={{ gap: 14, paddingHorizontal: 16 }}>
              {feed.length === 0 ? (
                <T size={12} color={palette.muted} style={{ textAlign: 'center', paddingVertical: 10, lineHeight: 18 }}>
                  Nothing new from your friends yet. When they add shinies to lists they share with you, they show up here.
                </T>
              ) : null}
              {feed.map((f) => {
                const who = byId[f.friendId];
                if (!who) return null;
                return (
                  <View key={f.id} style={{ backgroundColor: palette.card, borderWidth: 1, borderColor: palette.vio33, borderRadius: 18, overflow: 'hidden' }}>
                    <Tap onPress={() => openSheet({ type: 'feedItem', id: f.id })}>
                      <View style={{ paddingVertical: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <Avatar initial={who.initial} size={28} fill={palette.deep} fontSize={11} w={700} />
                        <T size={12.5} w={800} style={{ flexShrink: 1 }}>
                          {who.name} <T size={12.5} color={palette.muted}>added to</T> <T size={12.5} w={700}>{f.list}</T>
                        </T>
                        <T size={11} color={palette.muted} style={{ marginLeft: 'auto' }}>
                          {ago(f.at)}
                        </T>
                      </View>
                      <PhotoBox uri={f.image} style={{ height: 170 }} />
                      <View style={{ paddingTop: 11, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
                        <T size={14} w={700} style={{ flex: 1 }}>
                          {f.name}
                        </T>
                        <T size={14} w={800} color={palette.limeText}>
                          {f.price}
                        </T>
                      </View>
                      <T size={11.5} color={palette.muted} style={{ paddingTop: 2, paddingHorizontal: 14 }}>
                        {f.store}
                      </T>
                    </Tap>
                    <View style={{ paddingTop: 10, paddingBottom: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <WantButton wanted={f.wanted} onPress={() => wantToo(f.id)} />
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ paddingTop: 18, paddingHorizontal: 18, paddingBottom: 6, flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
          <T size={14} w={800}>
            Trending this week
          </T>
          <T size={11} color={palette.muted}>
            tap one to add it
          </T>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 16 }}>
          {trending.map((t) => {
            const tone = t.tone === 'pink' ? { bd: brand.pink66, bg: brand.pink, fg: brand.white } : t.tone === 'vio' ? { bd: palette.vio66, bg: palette.vio, fg: palette.bg } : { bd: palette.lime66, bg: brand.lime, fg: brand.limeInk };
            return (
              <Tap
                key={t.rank}
                onPress={() => {
                  // Trending is a list of names; tapping one looks up its real price.
                  openCamera({ mode: 'snap' });
                  void runCapture({ source: 'catalog', query: t.name });
                }}
                style={{ width: 122, backgroundColor: palette.card, borderWidth: 2, borderColor: tone.bd, borderRadius: 16, overflow: 'hidden' }}
              >
                <View style={{ position: 'absolute', top: 6, left: 6, zIndex: 1, backgroundColor: tone.bg, paddingVertical: 2, paddingHorizontal: 8, borderRadius: 6, transform: [{ rotate: '-3deg' }] }}>
                  <T size={11} w={800} color={tone.fg}>
                    {t.rank}
                  </T>
                </View>
                <PhotoBox style={{ height: 74 }} />
                <View style={{ paddingVertical: 8, paddingHorizontal: 10 }}>
                  <T size={11.5} w={600} style={{ lineHeight: 14 }}>
                    {t.name}
                  </T>
                  <T size={12} w={700} color={palette.limeText} style={{ marginTop: 2 }}>
                    {t.price}
                  </T>
                </View>
              </Tap>
            );
          })}
        </ScrollView>
      </ScrollView>
    </Appear>
  );
}

export function WantButton({ wanted, onPress, big }: { wanted: boolean; onPress: () => void; big?: boolean }) {
  const pad = big ? { paddingVertical: 12, alignItems: 'center' as const } : { paddingVertical: 8, paddingHorizontal: 16 };
  const label = wanted ? 'In My wants ✓' : 'Want it too';
  return (
    <Tap onPress={onPress} disabled={wanted} style={big ? { flex: 1 } : { marginLeft: 'auto' }}>
      {wanted ? (
        <View style={[{ backgroundColor: palette.chip, borderRadius: 999 }, pad]}>
          <T size={big ? 13.5 : 12.5} w={800} color={palette.soft}>
            {label}
          </T>
        </View>
      ) : (
        <LimeFill style={pad}>
          <T size={big ? 13.5 : 12.5} w={800} color={brand.limeInk}>
            {label}
          </T>
        </LimeFill>
      )}
    </Tap>
  );
}
