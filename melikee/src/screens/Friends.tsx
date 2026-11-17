import { useEffect, useState } from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { ago, daysUntil, label, SOON_DAYS } from '@/lib/dates';
import { listById, useApp, visibleLists } from '@/store/useApp';
import { brand, font, palette, ringSoon } from '@/theme/tokens';
import { Gift, Search } from '@/ui/icons';
import { Appear } from '@/ui/motion';
import { AccessChip, Avatar, Card, LimePill, SectionLabel, T, Tap } from '@/ui/primitives';
import { EmptyGlow } from './shared';

/** The checkerboard stand-in for a QR code, as drawn in the prototype. */
export function QrStub({ size = 52, light = palette.bg, dark = palette.text }: { size?: number; light?: string; dark?: string }) {
  const cells = 5;
  const c = (size - 6) / cells;
  return (
    <View style={{ width: size, height: size, borderRadius: 8, borderWidth: 3, borderColor: dark, overflow: 'hidden', backgroundColor: light }}>
      <Svg width={size - 6} height={size - 6}>
        {Array.from({ length: cells * cells }).map((_, i) => {
          const x = i % cells;
          const y = Math.floor(i / cells);
          return (x + y) % 2 === 0 ? <Rect key={i} x={x * c} y={y * c} width={c} height={c} fill={dark} /> : null;
        })}
      </Svg>
    </View>
  );
}

export function Friends() {
  const s = useApp((st) => st);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const shareable = visibleLists(s).filter((l) => l.vis !== 'me');
  const empty = s.friends.length === 0;
  const syncFriends = s.syncFriends;
  // Fresh requests and friends every time the tab opens.
  useEffect(() => {
    void syncFriends();
  }, [syncFriends]);

  const people = s.friends
    .filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))
    .map((p) => ({ ...p, days: daysUntil(p.birthday) }))
    .sort((a, b) => a.days - b.days);

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={[{ paddingTop: 16, paddingHorizontal: 18, paddingBottom: 110, gap: 10 }, empty && { flexGrow: 1, paddingBottom: 0 }]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <View style={{ flex: 1 }}>
            <T size={20} w={800}>
              Friends
            </T>
            <T size={11} color={palette.muted}>
              {empty ? 'You approve everyone — start with one' : `${s.friends.length} ${s.friends.length === 1 ? 'friend' : 'friends'}${s.sent.length ? ` · ${s.sent.length} requested` : ''}`}
            </T>
          </View>
           {!empty ? <LimePill label="+ Find" size={11.5} onPress={() => s.openSheet({ type: 'invite' })} style={{ paddingVertical: 6, paddingHorizontal: 13 }} /> : null}
        </View>

        {s.requests.length ? (
          <>
            <SectionLabel style={{ marginTop: 4 }}>REQUESTS</SectionLabel>
            {s.requests.map((r) => (
              <Card key={r.id} border={palette.lime66} style={{ paddingVertical: 12, paddingHorizontal: 14 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar initial={r.initial} size={38} fill={palette.deep} w={700} fontSize={13} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T size={13.5} w={700} numberOfLines={1}>
                      {r.handle && r.name === r.handle ? '' : `${r.name} `}
                      {r.handle ? (
                        <T size={12} w={600} color={palette.vio}>
                          @{r.handle}
                        </T>
                      ) : null}
                    </T>
                    <T size={11} color={palette.muted}>
                      wants to be friends · they’ll see your Friends lists
                    </T>
                  </View>
                  <LimePill label="Accept" size={11.5} onPress={() => void s.acceptRequest(r.id)} style={{ paddingVertical: 6, paddingHorizontal: 13 }} />
                  <Tap onPress={() => void s.declineRequest(r.id)} accessibilityLabel={`Decline ${r.name}`} style={{ paddingVertical: 10, paddingHorizontal: 2 }}>
                    <T size={11.5} w={700} color={palette.muted}>
                      Decline
                    </T>
                  </Tap>
                </View>
              </Card>
            ))}
          </>
        ) : null}

        {empty ? (
          <View style={{ flex: 1, marginHorizontal: -18, marginTop: 6 }}>
            <EmptyGlow fill icon="people" title={'Wishing is better\nwith your people'} cta="Find your people" onCta={() => s.openSheet({ type: 'invite' })} footer="Private lists never show. To anyone.">
              <View style={{ gap: 10, maxWidth: 270 }}>
                {[
                  ['1', brand.lime, brand.limeInk, 'They see your shinies', ' — friends follow the lists you choose. You approve everyone.'],
                  ['2', brand.pink, brand.white, 'You see theirs', ' — their wants fill your Feed, so birthday gifts stop being guesswork.'],
                  ['3', palette.vio, palette.bg, 'Gifts stay surprises', ' — dibs are invisible to the wisher. Always.'],
                ].map(([n, bg, fg, b, rest]) => (
                  <View key={n} style={{ flexDirection: 'row', gap: 10, alignItems: 'flex-start' }}>
                    <View style={{ backgroundColor: bg, minWidth: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' }}>
                      <T size={11} w={800} color={fg}>
                        {n}
                      </T>
                    </View>
                    <T size={12} color={palette.muted} style={{ flex: 1, lineHeight: 17 }}>
                      <T size={12} w={800}>
                        {b}
                      </T>
                      {rest}
                    </T>
                  </View>
                ))}
              </View>
            </EmptyGlow>
          </View>
        ) : (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.vio33, borderRadius: 999, paddingVertical: 9, paddingHorizontal: 14 }}>
              <Search color={palette.muted} />
              <TextInput value={q} onChangeText={setQ} placeholder="Filter friends" placeholderTextColor={palette.muted} style={{ flex: 1, fontSize: 13, fontFamily: font[500], color: palette.text, padding: 0 }} />
            </View>


            <SectionLabel style={{ marginTop: 4 }}>FRIENDS · NEXT BIRTHDAY FIRST</SectionLabel>
            {people.map((p) => {
              const soon = p.days <= SOON_DAYS;
              const seen = shareable.filter((l) => p.access[l.id] !== false).map((l) => l.name);
              const isOpen = open === p.id;
              const theirs = s.friendLists.filter((l) => l.friendId === p.id);
              const list = theirs.find((l) => l.isBirthday && soon) ?? theirs.find((l) => l.items.length) ?? theirs[0];
              return (
                <Card key={p.id} style={{ paddingVertical: 11, paddingLeft: 14, paddingRight: 12, gap: 10 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Tap onPress={() => (list ? s.go({ name: 'friendList', id: list.id }) : s.showToast(`${p.name} hasn’t shared a list with you yet`))} style={{ flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Avatar initial={p.initial} size={40} ring={soon ? ringSoon : null} gap={palette.card} w={700} fontSize={13} />
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <T size={13.5} w={700}>
                          {p.name}
                        </T>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                          <Gift color={soon ? brand.pink : palette.muted} />
                          <T size={11} w={soon ? 700 : 500} color={soon ? brand.pink : palette.muted}>
                            {label(p.birthday)} · in {p.days} days
                          </T>
                        </View>
                        <T size={11} color={palette.muted} numberOfLines={1}>
                          Sees: {seen.length ? seen.join(', ') : 'nothing yet'}
                        {theirs.length ? ` · shares ${theirs.length} ${theirs.length === 1 ? 'list' : 'lists'}` : ''}
                        </T>
                      </View>
                    </Tap>
                    <Tap onPress={() => setOpen(isOpen ? null : p.id)} accessibilityLabel={`Options for ${p.name}`} accessibilityState={{ expanded: isOpen }} style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: isOpen ? palette.chip : 'transparent' }}>
                      <T size={18} w={700} color={palette.muted}>
                        ⋯
                      </T>
                    </Tap>
                  </View>
                  {isOpen ? (
                    <Appear duration={200} style={{ gap: 9, borderTopWidth: 1, borderTopColor: palette.vio22, paddingTop: 10 }}>
                      <SectionLabel>CAN SEE</SectionLabel>
                      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
                        {shareable.map((l) => (
                          <AccessChip key={l.id} label={l.name} on={p.access[l.id] !== false} onPress={() => s.toggleAccess(p.id, l.id)} />
                        ))}
                      </View>
                      <View style={{ flexDirection: 'row', gap: 18, paddingTop: 2 }}>
                        <Tap onPress={() => s.openSheet({ type: 'confirm', action: 'remove', friendId: p.id })} style={{ paddingVertical: 8 }}>
                          <T size={12} w={700} color={palette.soft}>
                            Remove
                          </T>
                        </Tap>
                        <Tap onPress={() => s.openSheet({ type: 'confirm', action: 'block', friendId: p.id })} style={{ paddingVertical: 8 }}>
                          <T size={12} w={700} color={brand.pink}>
                            Block or report
                          </T>
                        </Tap>
                      </View>
                    </Appear>
                  ) : null}
                </Card>
              );
            })}
            {q && people.length === 0 ? (
              <T size={12} color={palette.muted} style={{ textAlign: 'center', padding: 8 }}>
                No friends match “{q}”
              </T>
            ) : null}

            <SectionLabel style={{ marginTop: 4 }}>HAVE YOUR LINK — NOT ON MELIKEE</SectionLabel>
            <Card style={{ paddingVertical: 4, paddingHorizontal: 14 }}>
              {s.linkHolders.map((h) => (
                <View key={h.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: palette.vio22 }}>
                  <Avatar initial={h.initial} size={30} fill={palette.inset} color={palette.muted} w={700} fontSize={11} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T size={12.5} w={700}>
                      {h.name}
                    </T>
                    <T size={11} color={palette.muted}>
                      {listById(s, h.listId).name} link · {h.action} · {ago(h.at)} ago
                    </T>
                  </View>
                </View>
              ))}
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 10 }}>
                <T size={11} color={palette.muted} style={{ flex: 1 }}>
                  Names come from what gifters type when they call dibs.
                </T>
                <Tap
                  onPress={() => {
                    s.resetLink();
                    s.showToast('New links made — the old ones stop working');
                  }}
                >
                  <T size={12} w={700} color={brand.pink}>
                    Reset links
                  </T>
                </Tap>
              </View>
            </Card>

            {s.sent.length ? (
              <>
                <SectionLabel style={{ marginTop: 4 }}>REQUESTED — WAITING</SectionLabel>
                {s.sent.map((p) => (
                  <View key={p.id} style={{ borderWidth: 1, borderStyle: 'dashed', borderColor: palette.vio44, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar initial={p.initial} size={32} fill={palette.inset} color={palette.muted} w={700} fontSize={12} />
                    <View style={{ flex: 1 }}>
                      <T size={12.5} w={700}>
                        {p.name}
                      </T>
                      <T size={11} color={palette.muted}>
                        {p.handle ? `@${p.handle} · ` : ''}sent {ago(p.at)} ago
                      </T>
                    </View>
                    <Tap
                      onPress={() => void s.cancelInvite(p.id)}
                      style={{ paddingVertical: 8 }}
                    >
                      <T size={12} w={700} color={palette.muted}>
                        Cancel
                      </T>
                    </Tap>
                  </View>
                ))}
              </>
            ) : null}
            <T size={11} color={palette.muted} style={{ textAlign: 'center', paddingVertical: 4, paddingHorizontal: 10, lineHeight: 16 }}>
              Private lists never show to anyone, no matter what’s checked here. Switch any list between private and shared in its settings.
            </T>
          </>
        )}
      </ScrollView>
    </Appear>
  );
}
