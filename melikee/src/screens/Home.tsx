/**
 * Home: one place to browse. "For you" is gift inspiration picked from your
 * lists (src/screens/Ideas.tsx); "Friends" is what your people want
 * (src/screens/Feed.tsx). Someone with no friends yet lands on For you, which
 * is full on day one; once you have friends, Home opens on Friends.
 */
import { View } from 'react-native';

import { homeSide, useApp } from '@/store/useApp';
import { brand, palette, paper } from '@/theme/tokens';
import { Bell } from '@/ui/icons';
import { T, Tap } from '@/ui/primitives';
import { Feed } from './Feed';
import { Ideas } from './Ideas';

export type HomeTab = 'foryou' | 'friends';

export function Home() {
  const tab: HomeTab = useApp(homeSide);
  const light = true;
  const setHomeTab = useApp((s) => s.setHomeTab);
  const unread = useApp((s) => s.notifs.filter((n) => !n.read).length);
  const go = useApp((s) => s.go);

  const seg = (t: HomeTab, label: string) => {
    const on = tab === t;
    return (
      <Tap
        onPress={() => setHomeTab(t)}
        accessibilityRole="tab"
        accessibilityState={{ selected: on }}
        style={{ paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, backgroundColor: on ? (light ? paper.card : brand.lime) : 'transparent' }}
      >
        <T size={14} w={light ? 500 : 800} color={on ? (light ? paper.cardText : brand.limeInk) : light ? paper.muted : palette.soft}>
          {label}
        </T>
      </Tap>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: light ? paper.bg : palette.bg }}>
      <View style={{ paddingTop: 10, paddingHorizontal: 22, paddingBottom: tab === 'friends' ? 0 : 8, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <View accessibilityRole="tablist" style={{ flexDirection: 'row', gap: 2, padding: 3, borderRadius: 999, backgroundColor: light ? paper.avatar : palette.card, borderWidth: 1, borderColor: light ? paper.line : palette.vio33 }}>
          {seg('foryou', 'For you')}
          {seg('friends', 'Friends')}
        </View>
        {/* The Feed draws its own bell next to its title. */}
        {tab === 'friends' ? null : (
          <>
            <View style={{ flex: 1 }} />
            <Tap onPress={() => go({ name: 'notifs' })} accessibilityLabel={`Notifications, ${unread} unread`} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Bell size={19} color={paper.text} />
              {unread ? (
                <View style={{ position: 'absolute', top: 4, right: 2, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: brand.pink, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 }}>
                  <T size={11} w={500} color={brand.white}>
                    {unread}
                  </T>
                </View>
              ) : null}
            </Tap>
          </>
        )}
      </View>
      {tab === 'foryou' ? <Ideas key="foryou" /> : <Feed key="friends" />}
    </View>
  );
}
