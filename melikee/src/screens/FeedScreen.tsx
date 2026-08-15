/**
 * The Feed — the engagement engine.
 *
 * It absorbed the welcome-back digest (which was becoming a daily gate), so
 * price drops, reactions, friend requests and birthday nudges all live here as
 * events rather than as an interstitial. Below the digest: what your people
 * want, then what's trending near you.
 */
import { useRouter } from 'expo-router';
import { ScrollView, View } from 'react-native';
import { useTopInset } from '@/hooks/useTopInset';

import { NullState } from '@/screens/shared/NullState';
import { FeedIcon, GiftIcon, PersonPlusIcon } from '@/ui/icons';
import { RiseIn } from '@/ui/motion';
import { AppText, Avatar, Button, Card, Chip, Eyebrow, Photo, Squish, Sticker } from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { avaList, digest, trending } from '@/data/seed';
import { shinies, useAppStore } from '@/store/useAppStore';
import { useCaptureStore } from '@/store/useCaptureStore';

export function FeedScreen() {
  const theme = useTheme();
  const router = useRouter();
  const topInset = useTopInset();

  const friends = useAppStore((s) => s.friends);
  const feed = useAppStore((s) => s.feed);
  const lists = useAppStore((s) => s.lists);
  const request = useAppStore((s) => s.request);
  const answerRequest = useAppStore((s) => s.answerRequest);
  const setRequestAccess = useAppStore((s) => s.setRequestAccess);
  const toggleReaction = useAppStore((s) => s.toggleReaction);
  const wantFromFeed = useAppStore((s) => s.wantFromFeed);
  const openSheet = useAppStore((s) => s.openSheet);

  const empty = friends.length === 0;

  // The nudge's count is real: it drops as you call dibs on her list, which is
  // the quiet urgency that gets gifts bought before the day.
  const friendDibs = useAppStore((s) => s.friendDibs);
  const avaRemaining = avaList.items.filter((item) => !friendDibs[item.id]).length;

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingTop: topInset + 12, paddingBottom: layout.dockClearance }}
    >
      <RiseIn>
        {/* Header */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 8,
            paddingHorizontal: 18,
            paddingBottom: 10,
          }}
        >
          <AppText style={{ fontSize: 26, fontWeight: '800', letterSpacing: -0.78 }}>
            The Feed
          </AppText>
          <AppText tone="muted" style={{ flex: 1, fontSize: 12 }} numberOfLines={1}>
            what your people want
          </AppText>
          {!empty ? (
            <Squish onPress={() => openSheet({ kind: 'invite' })} style={{ alignSelf: 'center' }}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 6,
                  backgroundColor: theme.card,
                  borderWidth: 1.5,
                  borderColor: theme.violet66,
                  borderRadius: layout.radius.pill,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                }}
              >
                <PersonPlusIcon size={14} color={theme.limeText} />
                <AppText tone="lime" style={{ fontSize: 11.5, fontWeight: '800' }}>
                  Find your people
                </AppText>
              </View>
            </Squish>
          ) : null}
        </View>

        {empty ? (
          <NullState
            icon={<FeedIcon size={26} color={theme.violet} />}
            headline={'Your Feed is quiet…\ntoo quiet.'}
            body="This is where your friends’ wants show up — and where you’ll call dibs on their birthday gifts."
            cta="Find your people"
            onPress={() => openSheet({ kind: 'invite' })}
            // Trending sits below, so this one stays top-anchored.
            anchor="top"
          />
        ) : null}

        {!empty ? (
          <>
            {/* Story rings — who's been adding. */}
            <View style={{ flexDirection: 'row', gap: 12, paddingHorizontal: 18, paddingBottom: 12 }}>
              {friends.slice(0, 4).map((friend, index) => (
                <View key={friend.id} style={{ alignItems: 'center', gap: 4 }}>
                  <Avatar
                    initial={friend.initial}
                    size={52}
                    ring={index < 2 ? 'gradient' : 'flat'}
                  />
                  <AppText
                    style={{ fontSize: 10, color: index < 2 ? theme.avatarText : theme.muted }}
                  >
                    {friend.name}
                  </AppText>
                </View>
              ))}
            </View>

            {/* The digest. */}
            <View style={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
              <Eyebrow>WHILE YOU WERE OUT</Eyebrow>

              {/* A birthday is the #1 reason to open a friend's list. */}
              <Card border="rgba(255,93,162,0.4)">
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <GiftIcon size={16} color={brand.pink} />
                  <AppText style={{ flex: 1, fontSize: 12 }}>
                    <AppText style={{ fontSize: 12, fontWeight: '800' }}>
                      {avaList.owner}’s birthday in {avaList.daysAway} days
                    </AppText>{' '}
                    · {shinies(avaRemaining)} still up for dibs
                  </AppText>
                  <Button
                    label="Peek"
                    variant="pink"
                    size="sm"
                    onPress={() =>
                      router.push({ pathname: '/friend/[id]', params: { id: avaList.friendId } })
                    }
                  />
                </View>
              </Card>

              {/* Passive cards are flattened so they don't look tappable. */}
              <Card variant="flat">
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <Sticker>{digest.priceDrop.delta}</Sticker>
                  <AppText style={{ flex: 1, fontSize: 12 }}>
                    {digest.priceDrop.product} dropped to{' '}
                    <AppText tone="lime" style={{ fontSize: 12, fontWeight: '800' }}>
                      {digest.priceDrop.to}
                    </AppText>{' '}
                    at {digest.priceDrop.store}
                  </AppText>
                </View>
              </Card>

              <Card variant="flat">
                <View
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 10,
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                  }}
                >
                  <AppText style={{ fontSize: 15 }}>{digest.reaction.emoji}</AppText>
                  <AppText style={{ flex: 1, fontSize: 12 }}>
                    <AppText style={{ fontSize: 12, fontWeight: '800' }}>
                      {digest.reaction.who}
                    </AppText>{' '}
                    reacted to your {digest.reaction.product}
                  </AppText>
                </View>
              </Card>

              {/* Requests are return triggers, so they surface here — when
                  there is one. A real new account has nobody knocking. */}
              {request ? (
              <Card border={theme.violet55}>
                <View style={{ paddingHorizontal: 14, paddingVertical: 10, gap: 9 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <Avatar initial={digest.request.initial} size={32} ring="none" />
                    <View style={{ flex: 1 }}>
                      <AppText style={{ fontSize: 12, fontWeight: '700' }}>
                        {digest.request.name} wants to follow your lists
                      </AppText>
                      <AppText tone="muted" style={{ fontSize: 10.5 }}>
                        {digest.request.mutual} mutual friends
                      </AppText>
                    </View>
                    {request.status === 'pending' ? (
                      <>
                        <Button label="Accept" size="sm" onPress={() => answerRequest('accepted')} />
                        <Squish onPress={() => answerRequest('declined')} hitSlop={8}>
                          <AppText tone="muted" style={{ fontSize: 11, fontWeight: '800' }}>
                            Decline
                          </AppText>
                        </Squish>
                      </>
                    ) : (
                      <AppText tone="muted" style={{ fontSize: 11, fontWeight: '700' }}>
                        {request.status === 'accepted' ? 'Following' : 'Declined'}
                      </AppText>
                    )}
                  </View>

                  {/* Accepting immediately asks what they can see — that's what
                      "friend" means in a wishlist app. */}
                  {request.status === 'accepted' ? (
                    <RiseIn style={{ gap: 7 }}>
                      <Eyebrow style={{ fontSize: 10.5 }}>
                        WHICH LISTS CAN {digest.request.name.toUpperCase()} SEE?
                      </Eyebrow>
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                        {lists
                          .filter((l) => l.visibility !== 'me')
                          .map((list) => (
                            <Chip
                              key={list.id}
                              label={list.name}
                              selected={!!request.access[list.id]}
                              onPress={() => setRequestAccess(list.id, !request.access[list.id])}
                            />
                          ))}
                      </View>
                    </RiseIn>
                  ) : null}
                </View>
              </Card>
              ) : null}
            </View>

            {/* What your people want. */}
            <View style={{ paddingHorizontal: 16, gap: 12 }}>
              {feed.map((post) => (
                <Card key={post.id} border={theme.violet66} style={{ borderRadius: layout.radius.bigCard }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Avatar initial={post.initial} size={28} ring="none" />
                    <AppText style={{ fontSize: 12.5 }}>
                      <AppText style={{ fontSize: 12.5, fontWeight: '800' }}>{post.who}</AppText>
                      <AppText tone="muted" style={{ fontSize: 12.5 }}>
                        {' '}
                        added to{' '}
                      </AppText>
                      <AppText tone="lime" style={{ fontSize: 12.5, fontWeight: '800' }}>
                        {post.listName}
                      </AppText>
                    </AppText>
                    <AppText tone="muted" style={{ marginLeft: 'auto', fontSize: 10.5 }}>
                      {post.when}
                    </AppText>
                  </View>

                  <View>
                    <Photo style={{ height: 124 }} />
                    <View style={{ position: 'absolute', bottom: 10, left: 12 }}>
                      <Sticker rotate={-1.5}>
                        {post.productName} · {post.productPrice}
                      </Sticker>
                    </View>
                  </View>

                  <View
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 10,
                      paddingHorizontal: 14,
                      paddingVertical: 10,
                    }}
                  >
                    <Reaction
                      emoji="🔥"
                      count={post.fires + (post.myFire ? 1 : 0)}
                      mine={post.myFire}
                      onPress={() => toggleReaction(post.id, 'fire')}
                    />
                    <Reaction
                      emoji="😍"
                      count={post.hearts + (post.myHeart ? 1 : 0)}
                      mine={post.myHeart}
                      onPress={() => toggleReaction(post.id, 'heart')}
                    />
                    <View style={{ marginLeft: 'auto' }}>
                      <Button
                        label={post.wanted ? 'In the bag ✓' : 'Want it too'}
                        variant={post.wanted ? 'chip' : 'lime'}
                        onPress={() => wantFromFeed(post.id)}
                      />
                    </View>
                  </View>
                </Card>
              ))}
            </View>
          </>
        ) : null}

        {/* Trending — the discovery surface, and what keeps an empty Feed alive. */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'baseline',
            gap: 8,
            paddingHorizontal: 18,
            paddingTop: 14,
            paddingBottom: 6,
          }}
        >
          <AppText style={{ fontSize: 14, fontWeight: '800' }}>Trending this week</AppText>
          <AppText tone="muted" style={{ fontSize: 11 }}>
            among 12–16s near you
          </AppText>
        </View>
        <TrendingRow />
      </RiseIn>
    </ScrollView>
  );
}

function Reaction({
  emoji,
  count,
  mine,
  onPress,
}: {
  emoji: string;
  count: number;
  mine: boolean;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Squish onPress={onPress}>
      <View
        style={{
          backgroundColor: mine ? theme.deep : theme.chip,
          borderWidth: 1,
          borderColor: theme.violet44,
          borderRadius: layout.radius.pill,
          paddingHorizontal: 10,
          paddingVertical: 5,
        }}
      >
        <AppText style={{ fontSize: 12, fontWeight: '700' }}>
          {emoji} {count}
        </AppText>
      </View>
    </Squish>
  );
}

/**
 * Trending cards tap into the found-card ritual — teens will tap them
 * expecting to add, so they do exactly that, reusing the reveal.
 */
function TrendingRow() {
  const theme = useTheme();
  const setActiveTab = useAppStore((s) => s.setActiveTab);

  const tones = {
    pink: { border: 'rgba(255,93,162,0.4)', bg: brand.pink, fg: brand.pinkInk },
    violet: { border: theme.violet66, bg: theme.violet, fg: theme.bg },
    lime: { border: theme.lime66, bg: brand.lime, fg: brand.limeInk },
  } as const;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{ paddingHorizontal: 16, gap: 10 }}
    >
      {trending.map((item) => {
        const tone = tones[item.tone];
        return (
          <Squish
            key={item.rank}
            onPress={() => {
              // Reuse the reveal: hand the trending pick to the capture flow.
              useCaptureStore.setState({
                phase: 'found',
                mode: 'snap',
                chosen: 0,
                candidates: [
                  {
                    name: item.name,
                    price: item.price,
                    stores: 'from trending',
                    storeName: 'Amazon',
                    upc: '—',
                    reason: 'trending this week',
                  },
                ],
              });
              setActiveTab('camera');
            }}
          >
            <View
              style={{
                width: 122,
                backgroundColor: theme.card,
                borderWidth: 2,
                borderColor: tone.border,
                borderRadius: layout.radius.card,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  zIndex: 1,
                  backgroundColor: tone.bg,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                  transform: [{ rotate: '-3deg' }],
                }}
              >
                <AppText style={{ fontSize: 10, fontWeight: '800', color: tone.fg }}>
                  {item.rank}
                </AppText>
              </View>
              <Photo style={{ height: 74 }} />
              <View style={{ paddingHorizontal: 10, paddingVertical: 8 }}>
                <AppText style={{ fontSize: 11.5, fontWeight: '700', lineHeight: 14 }}>
                  {item.name}
                </AppText>
                <AppText tone="lime" style={{ fontSize: 12, fontWeight: '800', marginTop: 2 }}>
                  {item.price}
                </AppText>
              </View>
            </View>
          </Squish>
        );
      })}
    </ScrollView>
  );
}
