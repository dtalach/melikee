import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { handleNote, useHandleCheck } from '@/components/useHandleCheck';

import { DAYS, MONTHS, shortDate, type Month } from '@/lib/dates';
import { cleanSizes, MAX_SIZE, SIZE_FIELDS, TOP_SIZES, type Sizes } from '@/lib/sizes';
import { listById, useApp, visibleLists } from '@/store/useApp';
import { brand, font, palette } from '@/theme/tokens';
import { AccentButton, Field, LimeButton, PhotoBox, Select, SheetTitle, T, Tap, ToggleRow } from '@/ui/primitives';

export function BdaySheet() {
  const p = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const close = useApp((s) => s.closeSheet);
  const showToast = useApp((s) => s.showToast);
  const [month, setMonth] = useState<Month>(p.birthday.month);
  const [day, setDay] = useState(String(p.birthday.day));
  const [remind, setRemind] = useState(p.remindGifters);
  const [countdown, setCountdown] = useState(p.showCountdown);
  return (
    <>
      <SheetTitle>Your birthday</SheetTitle>
      <T size={12} color={palette.muted} style={{ lineHeight: 18, marginTop: -6 }}>
        Drives your countdown and reminds the people on your birthday list. Year stays private.
      </T>
      <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
        <Select value={month} options={MONTHS} onChange={setMonth} style={{ flex: 2 }} accessibilityLabel="Month" />
        <Select value={day} options={DAYS} onChange={setDay} style={{ flex: 1 }} accessibilityLabel="Day" />
      </View>
      <ToggleRow title="Nudge gifters 2 weeks before" sub="one text to people with your link" on={remind} onPress={() => setRemind((x) => !x)} />
      <ToggleRow title="Show countdown to friends" sub="on your profile and in their Feed" on={countdown} onPress={() => setCountdown((x) => !x)} />
      <LimeButton
        label="Save"
        size={13.5}
        pad={12}
        onPress={() => {
          setProfile({ birthday: { ...p.birthday, month, day: parseInt(day, 10) }, remindGifters: remind, showCountdown: countdown });
          close();
          showToast(`Birthday set — ${month} ${day}`);
        }}
      />
    </>
  );
}

export function ParentSheet() {
  const p = useApp((s) => s.profile);
  const setProfile = useApp((s) => s.setProfile);
  const showToast = useApp((s) => s.showToast);
  const parent = p.parent;
  const first = parent?.name.split(' ')[0] ?? 'Your parent';
  const short = parent?.name.match(/\(([^)]+)\)/)?.[1] ?? first;

  return (
    <>
      <SheetTitle>Parent view</SheetTitle>
      <T size={12} color={palette.muted} style={{ lineHeight: 18, marginTop: -6 }}>
        Optional. A parent sees your shared lists and friends — never your private lists or who called dibs. You’ll always see what they can see.
      </T>
      {parent ? (
        <>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.inset, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 13 }}>
            <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: palette.deep, alignItems: 'center', justifyContent: 'center' }}>
              <T size={13} w={700} color={palette.avt}>
                {parent.name[0]}
              </T>
            </View>
            <View style={{ flex: 1 }}>
              <T size={13} w={700}>
                {parent.name}
              </T>
              <T size={11} color={palette.muted}>
                {parent.on ? `connected · ${shortDate(parent.since)}` : 'off'}
              </T>
            </View>
            <Tap onPress={() => showToast('Sends a new invite to a parent or guardian')}>
              <T size={11.5} w={600} color={palette.vio}>
                Change
              </T>
            </Tap>
          </View>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1, backgroundColor: palette.inset, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, gap: 5 }}>
              <T size={11} w={700} color={palette.limeText} style={{ letterSpacing: 0.66 }}>
                {short.toUpperCase()} CAN SEE
              </T>
              <T size={12} color={palette.soft} style={{ lineHeight: 18 }}>
                Shared lists · your friends · friend requests
              </T>
            </View>
            <View style={{ flex: 1, backgroundColor: palette.inset, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12, gap: 5 }}>
              <T size={11} w={700} color={brand.pink} style={{ letterSpacing: 0.66 }}>
                NEVER
              </T>
              <T size={12} color={palette.soft} style={{ lineHeight: 18 }}>
                Private lists · who called dibs
              </T>
            </View>
          </View>
          <ToggleRow title={`New friends need ${short}'s OK`} sub={`${short} gets a tap-to-approve text`} on={parent.approve} onPress={() => setProfile({ parent: { ...parent, approve: !parent.approve } })} />
          <ToggleRow title="Parent view on" sub={`turning off notifies ${short}`} on={parent.on} onPress={() => setProfile({ parent: { ...parent, on: !parent.on } })} />
        </>
      ) : (
        <AccentButton label="Add a parent" onPress={() => showToast('Sends an invite to a parent or guardian')} />
      )}
    </>
  );
}

/** The day after a birthday: Got it removes, Still want moves to My wants. */
export function CleanupSheet({ listId }: { listId: string }) {
  const s = useApp((st) => st);
  const list = listById(s, listId);
  const items = s.items.filter((i) => i.list === list.id);
  const [got, setGot] = useState<Record<number, boolean>>({});
  const [kept, setKept] = useState<Record<number, boolean>>({});
  const open = items.filter((i) => !got[i.id]);
  const gotCount = Object.values(got).filter(Boolean).length;

  return (
    <>
      <SheetTitle>Happy birthday, {s.profile.name}</SheetTitle>
      <T size={12} color={palette.muted} style={{ lineHeight: 18, marginTop: -6 }}>
        {items.length ? `Some of your ${list.name} wants were dibsed — we still won’t say which. Tell us what showed up.` : 'Nothing left to sort.'}
      </T>
      <View style={{ gap: 8 }}>
        {open.map((i) => {
          const k = !!kept[i.id];
          return (
            <View key={i.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.inset, borderRadius: 14, paddingVertical: 9, paddingHorizontal: 11 }}>
              <PhotoBox label="" style={{ width: 40, height: 40, borderRadius: 9 }} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <T size={13} w={700}>
                  {i.name}
                </T>
                <T size={11} color={palette.muted}>
                  {i.price}
                </T>
              </View>
              <Tap onPress={() => setGot((g) => ({ ...g, [i.id]: true }))} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: brand.lime }}>
                <T size={11.5} w={800} color={brand.limeInk}>
                  Got it
                </T>
              </Tap>
              <Tap onPress={() => setKept((c) => ({ ...c, [i.id]: !c[i.id] }))} style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: k ? palette.vio22 : palette.chip }}>
                <T size={11.5} w={700} color={k ? palette.vio : palette.soft}>
                  {k ? 'Kept ✓' : 'Still want'}
                </T>
              </Tap>
            </View>
          );
        })}
        {open.length === 0 ? (
          <T size={12.5} w={600} color={palette.soft} style={{ textAlign: 'center', padding: 8 }}>
            All sorted. Kept wants move to My wants.
          </T>
        ) : null}
      </View>
      <AccentButton
        label="Done"
        onPress={() => {
          s.finishCleanup({
            got: items.filter((i) => got[i.id]).map((i) => i.id),
            kept: open.filter((i) => kept[i.id]).map((i) => i.id),
          });
          s.showToast(gotCount ? `${gotCount} marked as got — thank-you time` : 'Sorted');
        }}
      />
    </>
  );
}

const NOTIF_ROWS: [keyof ReturnType<typeof useApp.getState>['notifSettings'], string, string][] = [
  ['drop', 'Price drops', 'on things you want, when alerts are on'],
  ['bday', 'Friends’ birthdays', '2 weeks and 3 days before'],
  ['too', 'Someone wants yours too', 'when a friend adds the same thing'],
  ['coming', 'Something’s coming', 'a hint when a gifter calls dibs, never what'],
  ['req', 'Friend requests', 'and when someone accepts yours'],
];

export function NotifSettingsSheet() {
  const ns = useApp((s) => s.notifSettings);
  return (
    <>
      <View style={{ height: 4 }} />
      <T size={17} w={800} style={{ marginBottom: 4 }}>
        Notifications
      </T>
      {NOTIF_ROWS.map(([k, t, sub]) => (
        <ToggleRow key={k} title={t} sub={sub} on={ns[k]} onPress={() => useApp.setState((s) => ({ notifSettings: { ...s.notifSettings, [k]: !s.notifSettings[k] } }))} style={{ paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: palette.vio22 }} />
      ))}
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingTop: 10 }}>
        <T size={12.5} w={600} style={{ flex: 1 }}>
          Quiet hours
        </T>
        <T size={12} w={700} color={palette.vio}>
          10pm – 7am
        </T>
      </View>
    </>
  );
}

/** Where new shinies land, and whether My wants starts shared. */
export function PrivacySheet() {
  const s = useApp((st) => st);
  const lists = visibleLists(s);
  const main = listById(s, 'w');
  return (
    <>
      <SheetTitle sub="Destination is also changeable on every add.">Privacy defaults</SheetTitle>
      <T size={11} w={700} color={palette.muted} style={{ letterSpacing: 0.66 }}>
        NEW SHINIES GO TO
      </T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
        {lists.map((l) => (
          <Tap key={l.id} onPress={() => useApp.setState({ lastList: l.id })} style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: l.id === s.lastList ? brand.lime : palette.chip }}>
            <T size={12} w={700} color={l.id === s.lastList ? brand.limeInk : palette.soft}>
              {l.name}
            </T>
          </Tap>
        ))}
      </View>
      <ToggleRow title="Friends can see My wants" sub={main.vis === 'me' ? 'private until you share it' : 'friends you pick see what you add'} on={main.vis !== 'me'} onPress={() => s.setVis('w', main.vis === 'me' ? 'friends' : 'me')} />
    </>
  );
}

/** Change your handle. Your link moves with it; the old one stops working. */
export function HandleSheet() {
  const current = useApp((s) => s.profile.handle);
  const currentName = useApp((s) => s.profile.name);
  const setProfile = useApp((s) => s.setProfile);
  const close = useApp((s) => s.closeSheet);
  const showToast = useApp((s) => s.showToast);
  const [draft, setDraft] = useState(current);
  const [name, setName] = useState(currentName === current ? '' : currentName);
  const h = draft.trim();
  const n = name.trim() || h;
  const status = useHandleCheck(h);
  const handleOk = h === current || status === 'free' || status === 'unknown';
  const ok = handleOk && (h !== current || n !== currentName);
  return (
    <>
      <SheetTitle sub="Gifters see your name on your links. Change your handle and links with the old one stop working.">Edit profile</SheetTitle>
      <Field value={name} onChangeText={setName} placeholder="Your first name (optional)" maxLength={40} autoCapitalize="words" accessibilityLabel="Name" />
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.vio44, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 12 }}>
        <T size={14} w={600} color={palette.muted}>
          @
        </T>
        <TextInput
          value={draft}
          onChangeText={(v) => setDraft(v.toLowerCase().replace(/\s/g, ''))}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Handle"
          style={{ flex: 1, fontSize: 14, fontFamily: font[600], color: palette.text, padding: 0 }}
        />
      </View>
      {h !== current ? (
        <T size={12} w={600} color={status === 'free' || status === 'unknown' ? palette.limeText : status === 'checking' ? palette.muted : brand.pink} style={{ marginTop: -4 }}>
          {handleNote(h, status)}
        </T>
      ) : null}
      <LimeButton
        label="Save"
        size={13.5}
        pad={12}
        disabled={!ok}
        onPress={() => {
          setProfile({ handle: h, name: n });
          close();
          showToast(h !== current ? `You’re @${h} now` : 'Saved');
        }}
      />
    </>
  );
}

export function SizesSheet() {
  const saved = useApp((s) => s.profile.sizes);
  const setProfile = useApp((s) => s.setProfile);
  const close = useApp((s) => s.closeSheet);
  const showToast = useApp((s) => s.showToast);
  const [sizes, setSizes] = useState<Sizes>(saved ?? {});
  const put = (key: keyof Sizes, v: string) => setSizes((x) => ({ ...x, [key]: v }));
  return (
    <>
      <SheetTitle>Your sizes</SheetTitle>
      <T size={12} color={palette.muted} style={{ lineHeight: 18, marginTop: -6 }}>
        Shown at the top of your shared links, so gifters get the right fit. Leave any blank.
      </T>
      {SIZE_FIELDS.map((f) => (
        <View key={f.key} style={{ gap: 6 }}>
          <T size={11} w={700} color={palette.muted} style={{ letterSpacing: 0.6, textTransform: 'uppercase' }}>
            {f.label}
          </T>
          {f.key === 'tops' ? (
            <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
              {TOP_SIZES.map((t) => {
                const on = sizes.tops === t;
                return (
                  <Tap
                    key={t}
                    onPress={() => put('tops', on ? '' : t)}
                    accessibilityRole="button"
                    accessibilityLabel={`Tops ${t}`}
                    style={{ paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999, backgroundColor: on ? brand.lime : palette.chip }}
                  >
                    <T size={12} w={700} color={on ? brand.limeInk : palette.soft}>
                      {t}
                    </T>
                  </Tap>
                );
              })}
            </View>
          ) : (
            <Field value={sizes[f.key] ?? ''} onChangeText={(v) => put(f.key, v)} placeholder={f.placeholder} maxLength={MAX_SIZE} accessibilityLabel={f.label} />
          )}
        </View>
      ))}
      <LimeButton
        label="Save"
        size={13.5}
        pad={12}
        onPress={() => {
          setProfile({ sizes: cleanSizes(sizes) });
          close();
          showToast('Sizes saved — gifters will see them');
        }}
      />
    </>
  );
}
