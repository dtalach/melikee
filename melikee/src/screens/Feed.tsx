/**
 * The Feed (Home → Friends), in the light style: a white page, thin
 * oversized type and plenty of air. Friends with a birthday coming lead the
 * row; the soonest birthday list gets the black countdown card, and in the
 * run-up to Christmas a second one counts down to Dec 25; then friends'
 * latest wants, big photo first; then what's trending.
 */
import { useEffect } from 'react';
import { ScrollView, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { ago, daysUntil, SOON_DAYS } from '@/lib/dates';
import { trending } from '@/store/seed';
import type { FriendList } from '@/store/types';
import { useApp } from '@/store/useApp';
import { brand, palette, paper } from '@/theme/tokens';
import { Appear } from '@/ui/motion';
import { LimeFill, PhotoBox, T, Tap } from '@/ui/primitives';

/** "AVA’S SWEET 16" — small, tracked-out caps. */
function Label({ children, color = paper.muted }: { children: string; color?: string }) {
  return (
    <T size={12} w={500} color={color} style={{ letterSpacing: 2.4, textTransform: 'uppercase' }}>
      {children}
    </T>
  );
}

/** The Christmas card shows from this many days out (about mid-October) until the day. */
const XMAS_WINDOW = 70;
const XMAS_DOT = '#4fd18b';

function Circle({ initial, ring, label, strong, onPress, a11y }: { initial: string; ring: string; label: string; strong?: boolean; onPress: () => void; a11y: string }) {
  return (
    <Tap onPress={onPress} accessibilityLabel={a11y} style={{ alignItems: 'center', gap: 8, width: 62 }}>
      <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 2.5, borderColor: ring, padding: 3 }}>
        <View style={{ flex: 1, borderRadius: 999, backgroundColor: paper.avatar, alignItems: 'center', justifyContent: 'center' }}>
          <T size={17} w={500} color={paper.text}>
            {initial}
          </T>
        </View>
      </View>
      <T size={12} w={strong ? 600 : 400} color={paper.text} numberOfLines={1}>
        {label}
      </T>
    </Tap>
  );
}

export function Feed() {
  const friends = useApp((s) => s.friends);
  const feed = useApp((s) => s.feed);
  const friendLists = useApp((s) => s.friendLists);
  const friendDibs = useApp((s) => s.friendDibs);
  const unread = useApp((s) => s.notifs.filter((n) => !n.read).length);
  const go = useApp((s) => s.go);
  const openSheet = useApp((s) => s.openSheet);
  const wantToo = useApp((s) => s.wantToo);
  const showToast = useApp((s) => s.showToast);
  const openCamera = useApp((s) => s.openCamera);
  const runCapture = useApp((s) => s.runCapture);
  const syncFriends = useApp((s) => s.syncFriends);
  useEffect(() => {
    void syncFriends();
  }, [syncFriends]);

  const people = friends.map((f) => ({ ...f, days: daysUntil(f.birthday) })).sort((a, b) => a.days - b.days);
  const empty = friends.length === 0;
  const byId = Object.fromEntries(friends.map((f) => [f.id, f]));
  const listOf = (id: string) => friendLists.find((l) => l.friendId === id && l.isBirthday) ?? friendLists.find((l) => l.friendId === id);

  // The soonest friend birthday with a list gets the countdown card.
  const bday = people.filter((p) => p.days <= SOON_DAYS).map((p) => ({ p, list: listOf(p.id) })).find((x) => x.list);
  const left = bday?.list ? bday.list.items.filter((i) => !i.taken && !friendDibs[i.id] && !i.pending).length : 0;
  const open = (items: FriendList['items']) => items.filter((i) => !i.taken && !friendDibs[i.id] && !i.pending).length;

  // Christmas gets its own countdown card in the run-up (see XMAS_WINDOW).
  const xmasDays = daysUntil({ month: 'Dec', day: 25 });
  const xmasLists = friendLists.filter((l) => (l.listId === 'xmas' || l.date === 'Dec 25') && byId[l.friendId]);
  const xmasTotal = xmasLists.reduce((n, l) => n + l.items.length, 0);
  const xmasOpen = xmasLists.reduce((n, l) => n + open(l.items), 0);
  const myXmas = useApp((st) => st.lists.find((l) => l.id === 'xmas' && !l.archived));

  return (
    <Appear style={{ flex: 1, backgroundColor: paper.bg }}>
      <ScrollView contentContainerStyle={{ paddingBottom: 130 }}>
        <View style={{ paddingTop: 18, paddingHorizontal: 24, paddingBottom: 22, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
            <T size={38} w={300} color={paper.text} style={{ letterSpacing: -1.2 }}>
              The Feed
            </T>
            <T size={14} w={400} color={paper.muted}>
              what your people want
            </T>
          </View>
          <Tap onPress={() => go({ name: 'notifs' })} accessibilityLabel={`Notifications, ${unread} unread`} style={{ width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: paper.ring, alignItems: 'center', justifyContent: 'center' }}>
            <BellLine />
            {unread ? (
              <View style={{ position: 'absolute', top: -4, right: -4, minWidth: 20, height: 20, borderRadius: 10, backgroundColor: brand.pink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5 }}>
                <T size={12} w={600} color={brand.white}>
                  {unread}
                </T>
              </View>
            ) : null}
          </Tap>
        </View>

        {empty ? (
          <View style={{ paddingHorizontal: 24, paddingTop: 40, gap: 16 }}>
            <T size={30} w={300} color={paper.text} style={{ letterSpacing: -0.8, lineHeight: 36 }}>
              {'Your Feed is quiet…\ntoo quiet.'}
            </T>
            <T size={15} w={400} color={paper.body} style={{ lineHeight: 22 }}>
              This is where your friends’ wants show up, and where you call dibs on their birthday gifts.
            </T>
            <Tap onPress={() => openSheet({ type: 'invite' })} style={{ alignSelf: 'flex-start', backgroundColor: paper.card, borderRadius: 999, paddingVertical: 13, paddingHorizontal: 22, marginTop: 6 }}>
              <T size={14} w={600} color={paper.cardText}>
                Find your people
              </T>
            </Tap>
          </View>
        ) : (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 24, paddingBottom: 30 }}>
              {people.map((p) => {
                const soon = p.days <= SOON_DAYS;
                const list = listOf(p.id);
                return (
                  <Circle
                    key={p.id}
                    initial={p.initial}
                    ring={soon ? brand.pink : paper.ring}
                    label={soon ? `${p.days}d` : p.name}
                    strong={soon}
                    a11y={soon ? `${p.name}, birthday in ${p.days} days` : p.name}
                    onPress={() => (list ? go({ name: 'friendList', id: list.id }) : showToast(`${p.name} hasn’t shared a list with you yet`))}
                  />
                );
              })}
              <Tap onPress={() => openSheet({ type: 'invite' })} accessibilityLabel="Find your people" style={{ alignItems: 'center', gap: 8, width: 62 }}>
                <View style={{ width: 58, height: 58, borderRadius: 29, borderWidth: 1.5, borderStyle: 'dashed', borderColor: paper.ring, alignItems: 'center', justifyContent: 'center' }}>
                  <T size={26} w={200} color={paper.muted}>
                    +
                  </T>
                </View>
                <T size={12} w={400} color={paper.muted}>
                  Invite
                </T>
              </Tap>
            </ScrollView>

            {bday?.list ? (
              <Tap onPress={() => go({ name: 'friendList', id: bday.list!.id })} accessibilityLabel={`${bday.list.name}: ${bday.p.days} days to go, see the list`} style={{ marginHorizontal: 24, backgroundColor: paper.card, borderRadius: 28, paddingTop: 26, paddingHorizontal: 26, paddingBottom: 26, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Label color={paper.cardMuted}>{`${bday.p.name}’s ${bday.list.isBirthday ? 'birthday' : bday.list.name}`}</Label>
                  </View>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: brand.pink }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
                  <T size={88} w={200} color={paper.cardText} style={{ letterSpacing: -4, lineHeight: 96 }}>
                    {String(bday.p.days)}
                  </T>
                  <T size={18} w={400} color={paper.cardText}>
                    {bday.p.days === 1 ? 'day to go' : bday.p.days === 0 ? 'today!' : 'days to go'}
                  </T>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 }}>
                  <T size={15} w={400} color={paper.cardMuted} style={{ flex: 1 }}>
                    {left} of {bday.list.items.length} still up for dibs
                  </T>
                  <T size={15} w={500} color={paper.cardText}>
                    See the list →
                  </T>
                </View>
              </Tap>
            ) : null}

            {xmasDays <= XMAS_WINDOW ? (
              <View accessibilityLabel={`Christmas: ${xmasDays} days to go`} style={{ marginHorizontal: 24, marginTop: bday?.list ? 14 : 0, backgroundColor: paper.card, borderRadius: 28, padding: 26, gap: 6 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Label color={paper.cardMuted}>Christmas</Label>
                  </View>
                  <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: XMAS_DOT }} />
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 12, marginTop: 6 }}>
                  <T size={88} w={200} color={paper.cardText} style={{ letterSpacing: -4, lineHeight: 96 }}>
                    {String(xmasDays)}
                  </T>
                  <T size={18} w={400} color={paper.cardText}>
                    {xmasDays === 1 ? 'day to go' : xmasDays === 0 ? 'today!' : 'days to go'}
                  </T>
                </View>
                {xmasLists.length ? (
                  <>
                    <T size={15} w={400} color={paper.cardMuted} style={{ marginTop: 10 }}>
                      {xmasTotal
                        ? `${xmasOpen} of ${xmasTotal} still up for dibs on ${xmasLists.length === 1 ? '1 friend’s list' : `${xmasLists.length} friends’ lists`}`
                        : `Nothing on ${xmasLists.length === 1 ? 'their list' : 'their lists'} yet — check back soon`}
                    </T>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 8 }} contentContainerStyle={{ gap: 10 }}>
                      {xmasLists.map((l) => {
                        const who = byId[l.friendId]!;
                        return (
                          <Tap key={l.id} onPress={() => go({ name: 'friendList', id: l.id })} accessibilityLabel={`${who.name}’s Christmas list`} style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6, paddingLeft: 6, paddingRight: 14, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.22)' }}>
                            <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' }}>
                              <T size={13} w={500} color={paper.cardText}>
                                {who.initial}
                              </T>
                            </View>
                            <T size={14} w={500} color={paper.cardText}>
                              {who.name}
                            </T>
                          </Tap>
                        );
                      })}
                    </ScrollView>
                  </>
                ) : (
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, gap: 10 }}>
                    <T size={15} w={400} color={paper.cardMuted} style={{ flex: 1 }}>
                      No friends’ Christmas lists yet
                    </T>
                    {myXmas ? (
                      <Tap onPress={() => go({ name: 'list', id: myXmas.id })} accessibilityLabel="Your Christmas list">
                        <T size={15} w={500} color={paper.cardText}>
                          Fill yours →
                        </T>
                      </Tap>
                    ) : null}
                  </View>
                )}
              </View>
            ) : null}

            <View style={{ paddingTop: 44, paddingHorizontal: 24, gap: 18 }}>
              <Label>Latest from friends</Label>
              {feed.length === 0 ? (
                <T size={15} w={400} color={paper.body} style={{ lineHeight: 22 }}>
                  Nothing new yet. When friends add to lists they share with you, it shows up here.
                </T>
              ) : null}
              {feed.map((f) => {
                const who = byId[f.friendId];
                if (!who) return null;
                return (
                  <View key={f.id} style={{ gap: 12, paddingBottom: 18 }}>
                    <Tap onPress={() => openSheet({ type: 'feedItem', id: f.id })} accessibilityLabel={`${f.name}, ${f.price}`}>
                      <View style={{ borderRadius: 14, overflow: 'hidden', backgroundColor: paper.photo, borderWidth: 1, borderColor: paper.line }}>
                        <PhotoBox light uri={f.image} label="photo" style={{ aspectRatio: 1.4 }} />
                      </View>
                    </Tap>
                    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 12 }}>
                      <View style={{ flex: 1, gap: 4 }}>
                        <T size={14} w={400} color={paper.body} numberOfLines={1}>
                          {who.name} · {f.list} · {ago(f.at)}
                        </T>
                        <T size={22} w={400} color={paper.text} style={{ letterSpacing: -0.3, lineHeight: 27 }} numberOfLines={2}>
                          {f.name}
                        </T>
                        <T size={14} w={400} color={paper.muted} numberOfLines={1}>
                          {f.price} · {f.store}
                        </T>
                      </View>
                      <Tap onPress={() => wantToo(f.id)} disabled={f.wanted} accessibilityLabel={f.wanted ? `${f.name} is in My wants` : `Want ${f.name} too`} style={{ paddingVertical: 6 }}>
                        <T size={16} w={500} color={f.wanted ? paper.muted : paper.text} style={{ textDecorationLine: f.wanted ? 'none' : 'underline' }}>
                          {f.wanted ? 'In My wants ✓' : 'Want it too'}
                        </T>
                      </Tap>
                    </View>
                  </View>
                );
              })}
            </View>
          </>
        )}

        <View style={{ paddingTop: 30, paddingHorizontal: 24, paddingBottom: 14 }}>
          <Label>Trending this week</Label>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 14, paddingHorizontal: 24 }}>
          {trending.map((t) => (
            <Tap
              key={t.rank}
              onPress={() => {
                // Trending is a list of names; tapping one looks up its real price.
                openCamera({ mode: 'snap' });
                void runCapture({ source: 'catalog', query: t.name });
              }}
              style={{ width: 150, gap: 8 }}
            >
              <View style={{ aspectRatio: 1, borderRadius: 14, backgroundColor: paper.photo, alignItems: 'flex-start', justifyContent: 'flex-start', padding: 10 }}>
                <T size={13} w={500} color={paper.muted}>
                  {t.rank}
                </T>
              </View>
              <T size={15} w={400} color={paper.text} numberOfLines={2} style={{ lineHeight: 19 }}>
                {t.name}
              </T>
              <T size={14} w={400} color={paper.muted}>
                {t.price}
              </T>
            </Tap>
          ))}
        </ScrollView>
      </ScrollView>
    </Appear>
  );
}

/** The bell, drawn thin to match the light Feed. */
function BellLine() {
  return (
    <Svg width={20} height={20} viewBox="0 0 16 16" fill="none" stroke={paper.text} strokeWidth={1.1}>
      <Path d="M8 2a4 4 0 014 4c0 3 1.5 4.5 1.5 4.5h-11S4 9 4 6a4 4 0 014-4zM6.5 13a1.5 1.5 0 003 0" />
    </Svg>
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
