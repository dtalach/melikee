import { useState } from 'react';
import { ScrollView, View } from 'react-native';

import { ago } from '@/lib/dates';
import { useApp } from '@/store/useApp';
import type { NotifKind } from '@/store/types';
import { brand, palette } from '@/theme/tokens';
import { Appear } from '@/ui/motion';
import { BackHeader, SectionLabel, T, Tap } from '@/ui/primitives';

const DOT: Record<NotifKind, string> = {
  drop: brand.lime,
  match: brand.lime,
  req: brand.lime,
  coming: brand.pink,
  love: brand.pink,
  bday: brand.pink,
  too: palette.vio,
};

const DAY = 86_400_000;

export function Notifications() {
  const notifs = useApp((s) => s.notifs);
  const settings = useApp((s) => s.notifSettings);
  const back = useApp((s) => s.back);
  const markRead = useApp((s) => s.markRead);
  const markAllRead = useApp((s) => s.markAllRead);
  const openSheet = useApp((s) => s.openSheet);
  const go = useApp((s) => s.go);

  const allowed = (k: NotifKind) => (k in settings ? settings[k as keyof typeof settings] : true);
  const [now] = useState(Date.now);
  const rows = notifs.filter((n) => allowed(n.kind)).sort((a, b) => b.at - a.at);
  // As in the prototype: anything from the last 24 hours is "Today".
  const isToday = (at: number) => now - at < DAY;

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 18, paddingBottom: 110, gap: 10 }}>
        <BackHeader
          title="Notifications"
          onBack={back}
          right={
            <View style={{ flexDirection: 'row' }}>
              <Tap onPress={markAllRead} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
                <T size={12} w={700} color={palette.soft}>
                  Mark all read
                </T>
              </Tap>
              <Tap onPress={() => openSheet({ type: 'notifSettings' })} style={{ paddingVertical: 8, paddingHorizontal: 4 }}>
                <T size={12} w={700} color={palette.vio}>
                  Settings
                </T>
              </Tap>
            </View>
          }
        />
        {rows.length === 0 ? (
          <T size={12} color={palette.muted} style={{ textAlign: 'center', paddingTop: 30 }}>
            Nothing new. We’ll tell you when something drops.
          </T>
        ) : null}
        {rows.map((n, i) => {
          const today = isToday(n.at);
          const prevToday = i > 0 && isToday(rows[i - 1].at);
          return (
            <View key={n.id} style={{ gap: 10 }}>
              {i === 0 || today !== prevToday ? <SectionLabel style={{ marginTop: 6 }}>{today ? 'TODAY' : 'EARLIER'}</SectionLabel> : null}
              <Tap
                onPress={() => {
                  markRead(n.id);
                  go(n.to);
                }}
                style={{ backgroundColor: n.read ? 'transparent' : palette.card, borderWidth: 1, borderColor: n.read ? palette.vio22 : palette.vio44, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 11 }}
              >
                <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: n.read ? 'transparent' : DOT[n.kind], marginTop: 4 }} />
                <View style={{ flex: 1, minWidth: 0 }}>
                  <T size={13} w={n.read ? 500 : 700} style={{ lineHeight: 17.5 }}>
                    {n.title}
                  </T>
                  <T size={11.5} color={palette.muted} style={{ marginTop: 2 }}>
                    {n.sub}
                  </T>
                </View>
                <T size={11} color={palette.muted}>
                  {ago(n.at)}
                </T>
              </Tap>
            </View>
          );
        })}
      </ScrollView>
    </Appear>
  );
}
