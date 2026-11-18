import * as Clipboard from 'expo-clipboard';
import { ScrollView, View } from 'react-native';

import { daysUntil, label } from '@/lib/dates';
import { LinkStatus } from '@/components/LinkStatus';
import { profileLink } from '@/lib/links';
import { friendsWithAccess, listAccent, plural, shinies, useApp, visibleLists } from '@/store/useApp';
import { brand, palette } from '@/theme/tokens';
import { Gear, Gift, Lock } from '@/ui/icons';
import { Appear } from '@/ui/motion';
import { Avatar, Card, GhostButton, LimeFill, SectionLabel, T, Tap } from '@/ui/primitives';
import { QrStub } from './Friends';
import { boardDecor, coverShots, MiniBoard } from './shared';

/** "today", "tomorrow", "in 12 days". */
function dayWord(n: number) {
  return n === 0 ? 'today' : n === 1 ? 'tomorrow' : `in ${n} days`;
}

export function Me() {
  const s = useApp((st) => st);
  const lists = visibleLists(s);
  const shared = lists.filter((l) => l.vis !== 'me');
  const privCount = lists.length - shared.length;
  const days = daysUntil(s.profile.birthday);
  const xmas = s.lists.find((l) => l.id === 'xmas' && !l.archived);
  const xmasDays = xmas?.date ? daysUntil(xmas.date) : null;
  const link = profileLink(s.profile.handle);
  const copy = () => {
    Clipboard.setStringAsync(link.url).catch(() => undefined);
    s.showToast('Link copied — send it anywhere');
  };

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110, gap: 11 }}>
        <View style={{ alignItems: 'center', gap: 7, paddingTop: 18, paddingBottom: 6 }}>
          <Tap onPress={() => s.go({ name: 'settings' })} accessibilityLabel="Settings" style={{ position: 'absolute', top: 12, right: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.vio44, alignItems: 'center', justifyContent: 'center' }}>
            <Gear color={palette.muted} />
          </Tap>
          <Avatar initial={s.profile.name[0]} size={76} ring={palette.deep} ringWidth={1} fontSize={28} />
          <T size={21} w={800} style={{ letterSpacing: -0.42 }}>
            {s.profile.name}
          </T>
          <T size={12.5} w={600} color={palette.vio} style={{ marginTop: -5 }}>
            @{s.profile.handle}
          </T>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8 }}>
            <Tap
              onPress={() => s.openSheet({ type: 'bday' })}
              accessibilityLabel={s.profile.birthdaySet === false ? 'Add your birthday' : `Birthday ${label(s.profile.birthday)}, in ${days} days. Edit`}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: brand.pink66, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 }}
            >
              <Gift color={brand.pink} />
              <T size={12} w={600} color={palette.soft}>
                {s.profile.birthdaySet === false ? 'Add your birthday' : `Birthday ${label(s.profile.birthday)} · ${dayWord(days)}`}
              </T>
            </Tap>
            {xmas && xmasDays != null ? (
              <Tap
                onPress={() => s.go({ name: 'list', id: xmas.id })}
                accessibilityLabel={`Christmas, in ${xmasDays} days`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: palette.vio44, borderRadius: 999, paddingVertical: 5, paddingHorizontal: 11 }}
              >

                <T size={12} w={600} color={palette.soft}>
                  Christmas · {dayWord(xmasDays)}
                </T>
              </Tap>
            ) : null}
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <GhostButton label="Edit profile" size={12} pad={7} onPress={() => s.openSheet({ type: 'handle' })} />
            <GhostButton label="Preview my page" size={12} pad={7} onPress={() => s.go({ name: 'gifter', listId: 'w' })} />
          </View>
        </View>

        <SectionLabel>WHAT FRIENDS SEE</SectionLabel>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', rowGap: 14 }}>
          {shared.map((l) => {
            const its = s.items.filter((i) => i.list === l.id);
            const f = friendsWithAccess(s, l.id).length;
            return (
              <MiniBoard
                key={l.id}
                width="48%"
                shots={coverShots(its)}
                accent={listAccent(l)}
                name={l.name}
                sub={l.vis === 'invite' ? `${shinies(its.length)} · anyone with the link` : `${shinies(its.length)} · ${plural(f, 'friend', 'friends')}`}
                onPress={() => s.go({ name: 'list', id: l.id })}
                decor={boardDecor(l)}
              />
            );
          })}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 }}>
          <Lock size={12} color={palette.muted} />
          <T size={11.5} color={palette.muted}>
            {privCount ? `${privCount} ${privCount === 1 ? 'list' : 'lists'} only you see` : 'Every list is shared'}
          </T>
        </View>

        <SectionLabel>YOUR LINK</SectionLabel>
        <Card onPress={() => s.go({ name: 'gifter', listId: 'w' })} border={palette.lime66} style={{ paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <QrStub size={50} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={13} w={700}>
              {link.display}
            </T>
            <T size={11} color={palette.muted} style={{ marginTop: 2 }}>
              Friends find you here. Family can call dibs without the app.
            </T>
            <View style={{ marginTop: 3 }}>
              <LinkStatus shared={shared.some((l) => l.vis === 'invite')} />
            </View>
          </View>
          <Tap onPress={copy}>
            <LimeFill style={{ paddingVertical: 7, paddingHorizontal: 13 }}>
              <T size={12} w={800} color={brand.limeInk}>
                Copy
              </T>
            </LimeFill>
          </Tap>
        </Card>
      </ScrollView>
    </Appear>
  );
}
