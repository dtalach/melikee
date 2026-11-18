/**
 * Home: one place to browse. "For you" is gift inspiration picked from your
 * lists (src/screens/Ideas.tsx); "Friends" is what your people want
 * (src/screens/Feed.tsx). Someone with no friends yet lands on For you, which
 * is full on day one; once you have friends, Home opens on Friends.
 */
import { View } from 'react-native';

import { useApp } from '@/store/useApp';
import { brand, palette } from '@/theme/tokens';
import { Bell } from '@/ui/icons';
import { T, Tap } from '@/ui/primitives';
import { Feed } from './Feed';
import { Ideas } from './Ideas';

export type HomeTab = 'foryou' | 'friends';

export function Home() {
  const hasFriends = useApp((s) => s.friends.length > 0);
  const picked = useApp((s) => s.homeTab);
  const setHomeTab = useApp((s) => s.setHomeTab);
  const unread = useApp((s) => s.notifs.filter((n) => !n.read).length);
  const go = useApp((s) => s.go);
  const tab: HomeTab = picked ?? (hasFriends ? 'friends' : 'foryou');

  const seg = (t: HomeTab, label: string) => {
    const on = tab === t;
    return (
      <Tap
        onPress={() => setHomeTab(t)}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: on ? brand.lime : 'transparent' }}
      >
        <T size={14} w={800} color={on ? brand.limeInk : palette.soft}>
          {label}
        </T>
      </Tap>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={{ paddingTop: 10, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 2, padding: 3, borderRadius: 999, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.vio33 }}>
          {seg('foryou', 'For you')}
          {seg('friends', 'Friends')}
        </View>
        <View style={{ flex: 1 }} />
        <Tap onPress={() => go({ name: 'notifs' })} accessibilityLabel={`Notifications, ${unread} unread`} style={{ width: 40, height: 40, borderRadius: 20, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.vio44, alignItems: 'center', justifyContent: 'center' }}>
          <Bell size={17} color={palette.text} />
          {unread ? (
            <View style={{ position: 'absolute', top: -3, right: -3, minWidth: 17, height: 17, borderRadius: 9, backgroundColor: brand.pink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
              <T size={11} w={700} color={brand.white}>
                {unread}
              </T>
            </View>
          ) : null}
        </Tap>
      </View>
      {tab === 'foryou' ? <Ideas key="foryou" /> : <Feed key="friends" />}
    </View>
  );
}
