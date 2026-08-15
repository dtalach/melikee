/**
 * Me — direction 10a, "Your eye".
 *
 * Not a settings closet: this screen is about you, your taste, and how people
 * reach you. Identity on top, the share link as the hero action (it's the most
 * viral thing in the app — non-users seeing a branded page), birthday, then
 * the flattery layer. Settings collapse behind the gear.
 */
import { useRouter } from 'expo-router';
import * as Clipboard from 'expo-clipboard';
import { ScrollView, View } from 'react-native';
import { useTopInset } from '@/hooks/useTopInset';

import { GearIcon, GiftIcon } from '@/ui/icons';
import { RiseIn, Twinkle } from '@/ui/motion';
import {
  AppText,
  Avatar,
  Button,
  Card,
  GlowGround,
  Photo,
  QrPlaceholder,
  Squish,
  Sticker,
} from '@/ui/primitives';
import { brand, layout } from '@/theme/tokens';
import { useTheme } from '@/theme/ThemeProvider';
import { shinyCountOffset, useAppStore } from '@/store/useAppStore';
import { birthdayLabel, daysUntilBirthday, profileLink } from '@/store/profile';

export function MeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const topInset = useTopInset();

  const items = useAppStore((s) => s.items);
  const profile = useAppStore((s) => s.profile);
  const demoContent = useAppStore((s) => s.demoContent);
  const openSheet = useAppStore((s) => s.openSheet);
  const markLinkCopied = useAppStore((s) => s.markLinkCopied);

  const birthday = birthdayLabel(profile);
  const daysToBirthday = daysUntilBirthday(profile);

  const stickerTones = ['lime', 'pink', 'violet'] as const;
  const rotations = [-2, 1.5, -1];

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: theme.bg }}
      contentContainerStyle={{ paddingBottom: layout.dockClearance }}
    >
      <RiseIn>
        {/* Identity. */}
        <GlowGround
          center={0}
          spread={{ x: 0.6, y: 0.5 }}
          style={{
            paddingTop: topInset + 16,
            paddingHorizontal: 18,
            paddingBottom: 15,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <Twinkle size={12} color={brand.lime} duration={2200} style={{ position: 'absolute', top: topInset + 16, left: 46 }} />
          <Twinkle size={9} color={brand.pink} duration={2800} delay={600} style={{ position: 'absolute', top: topInset + 42, right: 52 }} />

          <Squish
            onPress={() => openSheet({ kind: 'settings' })}
            style={{ position: 'absolute', top: topInset + 12, right: 14 }}
          >
            <View
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: theme.card,
                borderWidth: 1.5,
                borderColor: theme.violet44,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <GearIcon size={15} color={theme.muted} />
            </View>
          </Squish>

          <Avatar initial={profile.initial} size={70} />

          <AppText style={{ fontSize: 21, fontWeight: '800', letterSpacing: -0.42 }}>
            {profile.name}{' '}
            <AppText tone="violet" style={{ fontSize: 14, fontWeight: '600' }}>
              {profile.handle}
            </AppText>
          </AppText>

          {/* Taste tags are inferred from your shinies, so a new account has
              none to infer from yet. */}
          {profile.tasteTags?.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {profile.tasteTags.map((tag, index) => (
                <Sticker key={tag} tone={stickerTones[index % 3]} rotate={rotations[index % 3]}>
                  {tag}
                </Sticker>
              ))}
            </View>
          ) : null}

          <AppText tone="muted" style={{ fontSize: 11, textAlign: 'center' }}>
            your taste, read from your shinies — helps friends gift you right
          </AppText>
        </GlowGround>

        <View style={{ paddingHorizontal: 18, paddingTop: 12, gap: 11 }}>
          {/* The hero action: how people who don't have the app reach you. */}
          <Squish
            onPress={() =>
              router.push({ pathname: '/g/[handle]', params: { handle: profile.slug } })
            }
          >
            <Card border={theme.lime66}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 13,
                }}
              >
                <QrPlaceholder size={54} />
                <View style={{ flex: 1 }}>
                  <AppText style={{ fontSize: 13, fontWeight: '800' }}>{profileLink(profile)}</AppText>
                  <AppText tone="muted" style={{ fontSize: 11, marginTop: 2, lineHeight: 15 }}>
                    how friends find you — tap to preview what grandma sees, no app needed
                  </AppText>
                </View>
                <Button
                  label="Share"
                  size="sm"
                  onPress={async () => {
                    await Clipboard.setStringAsync(`https://${profileLink(profile)}`);
                    markLinkCopied();
                  }}
                />
              </View>
            </Card>
          </Squish>

          {/* The whole app leans on the birthday — the camera counts down to
              it and the Feed nudges friends about it. When it is missing, the
              card becomes the place to fix that rather than a blank. */}
          <Squish onPress={() => openSheet({ kind: 'birthday' })}>
            <Card border="rgba(255,93,162,0.4)">
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <GiftIcon size={16} color={brand.pink} />
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <AppText style={{ fontSize: 13, fontWeight: '700' }}>
                      {birthday ? `Birthday · ${birthday}` : 'Add your birthday'}
                    </AppText>
                    {daysToBirthday !== undefined ? (
                      <View
                        style={{
                          backgroundColor: brand.pink,
                          borderRadius: 5,
                          paddingHorizontal: 7,
                          paddingVertical: 2,
                        }}
                      >
                        <AppText style={{ fontSize: 9.5, fontWeight: '800', color: brand.pinkInk }}>
                          {daysToBirthday === 0 ? 'today' : `${daysToBirthday} days`}
                        </AppText>
                      </View>
                    ) : null}
                  </View>
                  <AppText tone="muted" style={{ fontSize: 11, marginTop: 2 }}>
                    {birthday
                      ? 'friends who can see a list of yours can see this'
                      : 'so the countdown works and friends get a nudge'}
                  </AppText>
                </View>
              </View>
            </Card>
          </Squish>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Stat
              value={String(items.length + shinyCountOffset(demoContent))}
              label="shinies"
              tone={theme.limeText}
            />
            <Stat value={String(profile.reactionsReceived)} label="reactions" tone={brand.pink} />
            <Stat value={String(profile.dibsCalled)} label="dibs called" tone={theme.violet} />
          </View>

          {/* The privacy promise, said out loud on the owner's side. */}
          <AppText tone="muted" style={{ fontSize: 10.5, textAlign: 'center' }}>
            dibs stay secret — you’ll never see which shinies are claimed
          </AppText>

          {/* Nothing can be most-loved until somebody has loved something. */}
          {profile.mostLovedShiny ? (
            <Card border={theme.violet44}>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                }}
              >
                <Photo style={{ width: 44, height: 44 }} radius={layout.radius.tile} />
                <View style={{ flex: 1 }}>
                  <AppText tone="muted" style={{ fontSize: 10.5, fontWeight: '800', letterSpacing: 0.63 }}>
                    MOST-LOVED SHINY
                  </AppText>
                  <AppText style={{ fontSize: 12.5, fontWeight: '700', marginTop: 2 }}>
                    {profile.mostLovedShiny.name} · 🔥 {profile.mostLovedShiny.fires}
                  </AppText>
                </View>
              </View>
            </Card>
          ) : null}
        </View>
      </RiseIn>
    </ScrollView>
  );
}

function Stat({ value, label, tone }: { value: string; label: string; tone: string }) {
  const theme = useTheme();
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: theme.card,
        borderWidth: 2,
        borderColor: theme.violet66,
        borderRadius: layout.radius.card,
        paddingHorizontal: 12,
        paddingVertical: 11,
        alignItems: 'center',
      }}
    >
      <AppText style={{ fontSize: 20, fontWeight: '800', color: tone }}>{value}</AppText>
      <AppText tone="muted" style={{ fontSize: 10.5, fontWeight: '700' }}>
        {label}
      </AppText>
    </View>
  );
}
