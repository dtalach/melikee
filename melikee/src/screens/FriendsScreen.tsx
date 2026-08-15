/**
 * Friends.
 *
 * Refocused from "People" (a management closet holding first-class real
 * estate) into the browsing view: friends, their birthdays, and what each one
 * can see. Access management stays here because "friend" in a wishlist app
 * really means "who can see my lists" — but it's one tap down, behind Manage.
 */
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { NullState } from '@/screens/shared/NullState';
import { ChevronRightIcon, FriendsIcon } from '@/ui/icons';
import { RiseIn } from '@/ui/motion';
import { AppText, Avatar, Button, Card, Chip, Eyebrow, Squish } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { avaList } from '@/data/seed';
import { useAppStore } from '@/store/useAppStore';
import { useState } from 'react';

const HOW_IT_WORKS = [
  {
    tone: 'lime' as const,
    title: 'They see your shinies',
    body: 'friends follow the lists you choose. You approve everyone.',
  },
  {
    tone: 'pink' as const,
    title: 'You see theirs',
    body: 'their wants fill your Feed, so birthday gifts stop being guesswork.',
  },
  {
    tone: 'violet' as const,
    title: 'Gifts stay surprises',
    body: 'dibs are invisible to the wisher. Always.',
  },
];

export function FriendsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [openFriend, setOpenFriend] = useState<string | null>(null);

  const friends = useAppStore((s) => s.friends);
  const sentInvites = useAppStore((s) => s.sentInvites);
  const lists = useAppStore((s) => s.lists);
  const setFriendAccess = useAppStore((s) => s.setFriendAccess);
  const removeFriend = useAppStore((s) => s.removeFriend);
  const blockFriend = useAppStore((s) => s.blockFriend);
  const cancelInvite = useAppStore((s) => s.cancelInvite);
  const openSheet = useAppStore((s) => s.openSheet);

  const empty = friends.length === 0;
  const shareable = lists.filter((l) => l.visibility !== 'me');

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{
        flexGrow: 1,
        paddingTop: insets.top + 16,
        paddingBottom: empty ? 0 : layout.dockClearance,
      }}
    >
      <RiseIn style={{ flex: 1 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            paddingHorizontal: 18,
            paddingBottom: 12,
          }}
        >
          <View style={{ flex: 1 }}>
            <AppText style={{ fontSize: 20, fontWeight: '800' }}>Friends</AppText>
            <AppText tone="muted" style={{ fontSize: 11 }}>
              {empty
                ? 'You approve everyone — start with one'
                : `${friends.length} friends · ${sentInvites.length} invited`}
            </AppText>
          </View>
          {/* In the empty state the card's own CTA is the single call. */}
          {!empty ? (
            <Button label="+ Invite" size="sm" onPress={() => openSheet({ kind: 'invite' })} />
          ) : null}
        </View>

        {empty ? (
          <NullState
            icon={<FriendsIcon size={30} color={theme.violet} />}
            headline={'Wishing is better\nwith your people'}
            steps={HOW_IT_WORKS}
            cta="Find your people"
            onPress={() => openSheet({ kind: 'invite' })}
            footnote="Secret stash and secret shinies never show. To anyone."
          />
        ) : (
          <View style={{ paddingHorizontal: 18, gap: 12 }}>
            {sentInvites.length > 0 ? (
              <>
                <Eyebrow>INVITED — WAITING</Eyebrow>
                {sentInvites.map((invite) => (
                  <Card key={invite.id} border={theme.violet44} style={{ opacity: 0.75 }}>
                    <View
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 10,
                        paddingHorizontal: 14,
                        paddingVertical: 11,
                      }}
                    >
                      <Avatar initial={invite.initial} size={36} ring="none" />
                      <View style={{ flex: 1 }}>
                        <AppText style={{ fontSize: 13, fontWeight: '700' }}>{invite.name}</AppText>
                        <AppText tone="muted" style={{ fontSize: 10.5 }}>
                          invite sent · {invite.when}
                        </AppText>
                      </View>
                      <Squish onPress={() => cancelInvite(invite.id)} hitSlop={8}>
                        <AppText tone="muted" style={{ fontSize: 11.5, fontWeight: '800' }}>
                          Cancel
                        </AppText>
                      </Squish>
                    </View>
                  </Card>
                ))}
              </>
            ) : null}

            <Eyebrow>YOUR FLOCK</Eyebrow>

            {friends.map((friend) => {
              const expanded = openFriend === friend.id;
              const isAva = friend.id === avaList.friendId;
              return (
                <Card key={friend.id} border={theme.violet66}>
                  <View style={{ paddingHorizontal: 14, paddingVertical: 12, gap: 9 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <Avatar initial={friend.initial} size={38} />
                      <View style={{ flex: 1 }}>
                        <AppText style={{ fontSize: 13.5, fontWeight: '800' }}>
                          {friend.name}
                        </AppText>
                        <AppText tone="muted" style={{ fontSize: 10.5 }}>
                          🎂 {friend.birthday}
                          {friend.daysAway ? ` — in ${friend.daysAway} days` : ''}
                        </AppText>
                      </View>

                      {/* Browsing is the point of this tab, so a friend's list
                          is one tap away where we have one to show. */}
                      {isAva ? (
                        <Squish
                          onPress={() =>
                            router.push({ pathname: '/friend/[id]', params: { id: friend.id } })
                          }
                          hitSlop={6}
                        >
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                            <AppText tone="lime" style={{ fontSize: 11.5, fontWeight: '800' }}>
                              Their list
                            </AppText>
                            <ChevronRightIcon size={12} color={theme.limeText} />
                          </View>
                        </Squish>
                      ) : null}

                      <Squish
                        onPress={() => setOpenFriend(expanded ? null : friend.id)}
                        hitSlop={8}
                      >
                        <AppText tone="violet" style={{ fontSize: 11.5, fontWeight: '800' }}>
                          {expanded ? 'Done' : 'Manage'}
                        </AppText>
                      </Squish>
                    </View>

                    {expanded ? (
                      <RiseIn style={{ gap: 8 }}>
                        <Eyebrow style={{ fontSize: 10.5 }}>CAN SEE</Eyebrow>
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                          {shareable.map((list) => (
                            <Chip
                              key={list.id}
                              label={list.name}
                              selected={!!friend.access[list.id]}
                              onPress={() =>
                                setFriendAccess(friend.id, list.id, !friend.access[list.id])
                              }
                            />
                          ))}
                        </View>
                        <View style={{ flexDirection: 'row', gap: 14, paddingTop: 2 }}>
                          <Squish onPress={() => removeFriend(friend.id)} hitSlop={6}>
                            <AppText
                              style={{ fontSize: 11.5, fontWeight: '800', color: brand.pink }}
                            >
                              Remove friend
                            </AppText>
                          </Squish>
                          <Squish onPress={() => blockFriend(friend.id)} hitSlop={6}>
                            <AppText tone="muted" style={{ fontSize: 11.5, fontWeight: '800' }}>
                              Block
                            </AppText>
                          </Squish>
                        </View>
                      </RiseIn>
                    ) : null}
                  </View>
                </Card>
              );
            })}

            <View
              style={{
                backgroundColor: theme.inset,
                borderRadius: layout.radius.chip,
                paddingHorizontal: 14,
                paddingVertical: 11,
              }}
            >
              <AppText tone="muted" style={{ fontSize: 11, lineHeight: 16 }}>
                Secret stash and secret shinies never show to anyone, no matter what’s checked here.
              </AppText>
            </View>
          </View>
        )}
      </RiseIn>
    </ScrollView>
  );
}
