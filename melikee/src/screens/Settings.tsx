import { ScrollView, View } from 'react-native';

import { daysUntil, label } from '@/lib/dates';
import { useApp } from '@/store/useApp';
import { brand, palette } from '@/theme/tokens';
import { Gift, Shield } from '@/ui/icons';
import { Appear } from '@/ui/motion';
import { sizeParts } from '@/lib/sizes';
import { BackHeader, NavRow, SectionLabel, T, Tap } from '@/ui/primitives';
import { useBirthdayCleanup } from './useBirthdayCleanup';

export function Settings() {
  const s = useApp((st) => st);
  const p = s.profile;
  const days = daysUntil(p.birthday);
  const parentName = p.parent?.name.split(' ')[0] ?? 'Parent';
  const archived = s.lists.filter((l) => l.archived);
  const cleanup = useBirthdayCleanup();
  const parentSub = p.parent?.on
    ? p.parent.approve
      ? `${parentName} approves new friends · never sees dibs or secrets`
      : `${parentName} sees shared lists · never dibs or secrets`
    : 'no parent connected';

  return (
    <Appear style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ paddingTop: 14, paddingHorizontal: 18, paddingBottom: 110, gap: 11 }}>
        <BackHeader title="Settings" onBack={s.back} />
        <SectionLabel>OCCASIONS</SectionLabel>
        <NavRow
          onPress={() => s.openSheet({ type: 'bday' })}
          border={brand.pink66}
          left={<Gift size={16} strokeWidth={1.3} color={brand.pink} />}
          title={
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <T size={13} w={700}>
                Birthday · {label(p.birthday)}
              </T>
              <View style={{ backgroundColor: brand.pink, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5, marginLeft: 4 }}>
                <T size={11} w={800} color={brand.white}>
                  {days} days
                </T>
              </View>
            </View>
          }
          sub="friends with your birthday list can see this"
          right={
            <T size={11.5} w={600} color={palette.vio}>
              Edit
            </T>
          }
        />
        <NavRow
          onPress={() => s.openSheet({ type: 'sizes' })}
          title="Your sizes"
          sub={sizeParts(p.sizes).join(' · ') || 'add them so gifters get the right fit'}
          right={
            <T size={11.5} w={600} color={palette.vio}>
              {p.sizes ? 'Edit' : 'Add'}
            </T>
          }
        />
        <NavRow onPress={() => s.openSheet({ type: 'parent' })} left={<Shield color={palette.vio} />} title={`Parent view · ${p.parent?.on ? parentName : 'off'}`} sub={parentSub} />
        {cleanup ? (
          <NavRow
            onPress={() => s.openSheet({ type: 'cleanup', listId: cleanup.id })}
            border={palette.lime66}
            title="Sort your birthday gifts"
            sub="what you got, and what you still want"
          />
        ) : null}

        <SectionLabel style={{ marginTop: 6 }}>PRIVACY &amp; ACCOUNT</SectionLabel>
        <NavRow onPress={() => s.openSheet({ type: 'notifSettings' })} title="Notifications" sub="price drops · friends’ birthdays · when someone wants yours too" />
        <NavRow onPress={() => s.openSheet({ type: 'privacy' })} title="Privacy defaults" sub={`new shinies go to ${s.lists.find((l) => l.id === s.lastList)?.name ?? 'My wants'} · ${s.lists.find((l) => l.id === 'w')?.vis === 'me' ? 'only you can see' : 'friends can see'}`} />
        <NavRow onPress={() => s.openSheet({ type: 'handle' })} title="Account" sub={`@${p.handle}${s.phone ? ` · phone ending in ${s.phone.last2}` : ''}`} />

        {archived.length ? (
          <>
            <SectionLabel style={{ marginTop: 6 }}>ARCHIVED LISTS</SectionLabel>
            {archived.map((l) => (
              <View key={l.id} style={{ backgroundColor: palette.card, borderWidth: 1, borderColor: palette.vio33, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center' }}>
                <T size={13} w={700} style={{ flex: 1 }}>
                  {l.name}
                </T>
                <Tap
                  onPress={() => {
                    s.updateList(l.id, { archived: false });
                    s.showToast(`${l.name} is back`);
                  }}
                >
                  <T size={12} w={700} color={palette.vio}>
                    Restore
                  </T>
                </Tap>
              </View>
            ))}
          </>
        ) : null}
      </ScrollView>
    </Appear>
  );
}
