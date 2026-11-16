import * as Clipboard from 'expo-clipboard';
import { ScrollView, View } from 'react-native';

import { daysUntil, label } from '@/lib/dates';
import { friendsWithAccess, listAccent, plural, shinies, useApp, visibleLists } from '@/store/useApp';
import { brand, palette, ringSoon } from '@/theme/tokens';
import { Chevron, Gear, Gift, Lock } from '@/ui/icons';
import { Appear } from '@/ui/motion';
import { Avatar, Card, GhostButton, LimeFill, PhotoBox, SectionLabel, T, Tap } from '@/ui/primitives';
import { QrStub } from './Friends';

export const PROFILE_HOST = 'melikee.app';

export function Me() {
  const s = useApp((st) => st);
  const lists = visibleLists(s);
  const shared = lists.filter((l) => l.vis !== 'me');
  const privCount = lists.length - shared.length;
  const days = daysUntil(s.profile.birthday);
  const link = `${PROFILE_HOST}/${s.profile.handle}`;
  const copy = () => {
    Clipboard.setStringAsync(`https://${link}`).catch(() => undefined);
    s.showToast('Link copied — send it anywhere');
  };

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 18, paddingBottom: 110, gap: 11 }}>
        <View style={{ alignItems: 'center', gap: 7, paddingTop: 18, paddingBottom: 6 }}>
          <Tap onPress={() => s.go({ name: 'settings' })} accessibilityLabel="Settings" style={{ position: 'absolute', top: 12, right: 0, width: 40, height: 40, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.vio44, alignItems: 'center', justifyContent: 'center' }}>
            <Gear color={palette.muted} />
          </Tap>
          <Avatar initial={s.profile.name[0]} size={76} ring={ringSoon} ringWidth={3} fontSize={26} />
          <T size={21} w={800} style={{ letterSpacing: -0.42 }}>
            {s.profile.name}
          </T>
          <T size={12.5} w={600} color={palette.vio} style={{ marginTop: -5 }}>
            @{s.profile.handle}
          </T>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Gift color={brand.pink} />
            <T size={12} w={600} color={palette.soft}>
              Birthday {label(s.profile.birthday)} · in {days} days
            </T>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
            <GhostButton label="Edit profile" size={12} pad={7} onPress={() => s.showToast('Edit name, handle, photo')} />
            <GhostButton label="Preview my page" size={12} pad={7} onPress={() => s.go({ name: 'gifter', listId: 'w' })} />
          </View>
        </View>

        <SectionLabel>WHAT FRIENDS SEE</SectionLabel>
        {shared.map((l) => {
          const n = s.items.filter((i) => i.list === l.id).length;
          const f = friendsWithAccess(s, l.id).length;
          return (
            <Card key={l.id} onPress={() => s.go({ name: 'list', id: l.id })} style={{ paddingVertical: 11, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <PhotoBox label="" style={{ width: 44, height: 44, borderRadius: 11, borderWidth: 2, borderColor: listAccent(l) }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={13.5} w={700}>
                  {l.name}
                </T>
                <T size={11.5} color={palette.muted}>
                  {shinies(n)} · {plural(f, 'friend', 'friends')}
                  {l.vis === 'invite' ? ' + link' : ''}
                </T>
              </View>
              <Chevron dir="right" size={14} color={palette.muted} />
            </Card>
          );
        })}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 2 }}>
          <Lock size={12} color={palette.muted} />
          <T size={11.5} color={palette.muted}>
            {privCount ? `${privCount} private ${privCount === 1 ? 'list' : 'lists'} — only you see ${privCount === 1 ? 'it' : 'them'}` : 'No private lists'}
          </T>
        </View>

        <SectionLabel>YOUR LINK</SectionLabel>
        <Card onPress={() => s.go({ name: 'gifter', listId: 'w' })} border={palette.lime66} style={{ paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <QrStub size={50} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T size={13} w={700}>
              {link}
            </T>
            <T size={11} color={palette.muted} style={{ marginTop: 2 }}>
              Friends find you here. Family can call dibs without the app.
            </T>
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
