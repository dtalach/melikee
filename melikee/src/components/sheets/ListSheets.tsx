import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { Share as NativeShare, TextInput, View } from 'react-native';

import { DAYS, label, MONTHS, type Month } from '@/lib/dates';
import { listLink } from '@/lib/links';
import { friendsWithAccess, listById, listDays, useApp } from '@/store/useApp';
import type { LinkExpiry, Vis } from '@/store/types';
import { brand, font, listColors, palette } from '@/theme/tokens';
import { Chevron, LinkIcon, Lock, People } from '@/ui/icons';
import { Appear } from '@/ui/motion';
import { ChipButton, Field, GhostButton, LimeButton, LimeFill, OptionPill, Radio, SectionLabel, Select, SheetTitle, T, Tap, ToggleRow } from '@/ui/primitives';

/** "Write one for me" — the prototype's line, without assuming an age. */
const NOTE_IDEA = "Hello all, my birthday's coming up! Your company is all I ask — but if you need ideas, here they are";

export function ShareSheet({ listId }: { listId: string }) {
  const s = useApp((st) => st);
  const list = listById(s, listId);
  const [copied, setCopied] = useState(false);
  const [more, setMore] = useState(false);
  const { display: url, url: fullUrl } = listLink(s.profile.handle, list);
  const days = listDays(s, list);

  // Copying the link upgrades the list to Friends + link (spec).
  const copy = () => {
    Clipboard.setStringAsync(fullUrl).catch(() => undefined);
    const up = list.vis !== 'invite';
    if (up) s.setVis(list.id, 'invite');
    setCopied(true);
    s.showToast(up ? 'Link copied — list is now Friends + link' : 'Link copied — send it to anyone');
  };
  const send = () => {
    if (list.vis !== 'invite') s.setVis(list.id, 'invite');
    NativeShare.share({ message: `${s.profile.name}'s ${list.name} on MeLikee — ${fullUrl}`, url: fullUrl }).catch(() => copy());
  };

  const visNote =
    list.vis === 'me'
      ? 'Heads up: this list is private. Copying the link makes it Friends + link.'
      : list.vis === 'friends'
        ? 'Copying the link switches this list to Friends + link.'
        : 'Friends in the app see it in their Feed too.';
  const expiryLabel: Record<LinkExpiry, string> = {
    date: days != null ? `Till ${dayAfter(list.isBirthday ? s.profile.birthday : list.date!)}` : 'Till the date',
    '30d': '30 days',
    always: 'Always',
  };
  const expiryOpts: LinkExpiry[] = days != null ? ['date', '30d', 'always'] : ['30d', 'always'];

  return (
    <>
      <SheetTitle sub={visNote}>Share {list.name}</SheetTitle>
      <Tap onPress={copy} style={{ backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.lime66, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <T size={13.5} w={700} color={palette.limeText} numberOfLines={1} style={{ flex: 1 }}>
          {url}
        </T>
        <View style={{ backgroundColor: brand.lime, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999 }}>
          <T size={12} w={800} color={brand.limeInk}>
            {copied ? 'Copied ✓' : 'Copy'}
          </T>
        </View>
      </Tap>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {['Text', 'WhatsApp', 'Email'].map((x) => (
          <GhostButton key={x} label={x} size={12.5} pad={11} flex onPress={send} />
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <Tap onPress={() => s.go({ name: 'gifter', listId: list.id })} style={{ paddingVertical: 8 }}>
          <T size={12.5} w={700} color={palette.vio}>
            Preview what gifters see →
          </T>
        </Tap>
        <Tap onPress={() => setMore((m) => !m)} style={{ paddingVertical: 8 }}>
          <T size={12.5} w={700} color={palette.soft}>
            {more ? 'Fewer options' : 'More options'}
          </T>
        </Tap>
      </View>
      {more ? (
        <Appear duration={200} style={{ gap: 10, borderTopWidth: 1, borderTopColor: palette.vio22, paddingTop: 12 }}>
          <SectionLabel>NOTE AT THE TOP OF YOUR PAGE</SectionLabel>
          <TextInput
            value={list.note ?? ''}
            onChangeText={(v) => s.updateList(list.id, { note: v })}
            multiline
            numberOfLines={2}
            style={{ backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.vio44, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12, fontSize: 13, fontFamily: font[500], color: palette.text, lineHeight: 19, minHeight: 58, textAlignVertical: 'top' }}
          />
          <Tap onPress={() => s.updateList(list.id, { note: NOTE_IDEA })} style={{ alignSelf: 'flex-start' }}>
            <T size={12} w={700} color={palette.vio}>
              Write one for me
            </T>
          </Tap>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <T size={11.5} color={palette.muted} style={{ marginRight: 2 }}>
              Link works
            </T>
            {expiryOpts.map((o) => (
              <OptionPill key={o} label={expiryLabel[o]} on={list.linkExpiry === o} onPress={() => s.updateList(list.id, { linkExpiry: o })} />
            ))}
            <Tap
              onPress={() => {
                s.resetLink(list.id);
                setCopied(false);
                s.showToast('New link made — the old one stops working');
              }}
              style={{ marginLeft: 'auto' }}
            >
              <T size={11.5} w={700} color={brand.pink}>
                Reset
              </T>
            </Tap>
          </View>
        </Appear>
      ) : null}
      <T size={11} color={palette.muted} style={{ textAlign: 'center' }}>
        No app needed to open it. You’ll never see what’s been dibsed.
      </T>
    </>
  );
}

function dayAfter(d: { month: Month; day: number }) {
  const mi = MONTHS.indexOf(d.month);
  const next = new Date(2001, mi, d.day + 1);
  return `${MONTHS[next.getMonth()]} ${next.getDate()}`;
}

const VIS_OPTS: { k: Vis; title: string; body: string; Icon: typeof Lock }[] = [
  { k: 'me', title: 'Private', body: 'Only you. Great for saving ideas before you decide.', Icon: Lock },
  { k: 'friends', title: 'Friends', body: 'The friends you pick. It shows up in their Feed.', Icon: People },
  { k: 'invite', title: 'Friends + link', body: 'Also anyone with your link, no app needed. Best for family and birthdays.', Icon: LinkIcon },
];

/** "Who sees …?" — the one sharing scale, with a plain-language consequence. */
export function VisSheet({ listId }: { listId: string }) {
  const s = useApp((st) => st);
  const list = listById(s, listId);
  const cur = list.vis;
  const [d, setD] = useState<Vis>(cur);
  const f = friendsWithAccess(s, list.id).map((p) => p.name);
  const fWho = f.length ? `${f.length > 2 ? `${f.slice(0, 2).join(', ')} + ${f.length - 2}` : f.join(' & ')} can see it` : 'No friends picked yet — choose in Friends';
  const linkN = s.linkHolders.filter((h) => h.listId === list.id).length;

  let note = '';
  if (d !== cur) {
    if (d === 'me') note = `${f.length ? `${f.join(', ')} will stop seeing it. ` : ''}${cur === 'invite' ? 'Your link stops working. ' : ''}Nobody is told.`;
    else if (cur === 'me') note = d === 'invite' ? 'Everything on this list becomes visible to your picked friends and anyone with the link.' : 'Everything on this list becomes visible to the friends you pick.';
    else if (d === 'friends') note = `Your link stops working${linkN ? ` for the ${linkN} ${linkN === 1 ? 'person' : 'people'} who have it` : ''}. Friends keep access.`;
    else note = 'You’ll get a link to send to anyone. Gifters can call dibs without the app.';
  }
  const cta = d === cur ? 'Done' : d === 'me' ? 'Make it private' : d === 'friends' ? 'Share with friends' : 'Share with friends + link';

  const confirm = () => {
    if (d === cur) {
      s.closeSheet();
      return;
    }
    s.setVis(list.id, d);
    if (d === 'invite') s.openSheet({ type: 'share', listId: list.id });
    else s.closeSheet();
    s.showToast(d === 'me' ? `${list.name} is private` : d === 'invite' ? 'Link is on — send it to family' : `${list.name} shared with friends`);
  };

  return (
    <>
      <T size={17} w={800} style={{ marginBottom: 2 }}>
        Who sees {list.name}?
      </T>
      {VIS_OPTS.map(({ k, title, body, Icon }) => {
        const on = d === k;
        const who = k === 'me' ? '' : k === 'friends' ? fWho : fWho + (linkN ? ` · ${linkN} ${linkN === 1 ? 'person has' : 'people have'} the link` : '');
        return (
          <Tap
            key={k}
            onPress={() => setD(k)}
            accessibilityRole="radio"
            accessibilityState={{ selected: on }}
            style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 13, paddingHorizontal: 14, borderRadius: 16, borderWidth: 1.5, borderColor: on ? palette.vio : palette.vio33, backgroundColor: on ? palette.vio22 : 'transparent' }}
          >
            <View style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: palette.inset, alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={17} strokeWidth={1.4} color={on ? palette.text : palette.muted} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <T size={14} w={700}>
                {title}
              </T>
              <T size={11.5} color={palette.muted} style={{ lineHeight: 16.5, marginTop: 2 }}>
                {body}
              </T>
              {on && who ? (
                <T size={11.5} w={600} color={palette.soft} style={{ marginTop: 6 }}>
                  {who}
                </T>
              ) : null}
            </View>
            <View style={{ marginTop: 6 }}>
              <Radio on={on} />
            </View>
          </Tap>
        );
      })}
      {note ? (
        <View style={{ backgroundColor: palette.inset, borderRadius: 12, paddingVertical: 10, paddingHorizontal: 12 }}>
          <T size={12} color={palette.soft} style={{ lineHeight: 18 }}>
            {note}
          </T>
        </View>
      ) : null}
      <Tap onPress={confirm} style={{ marginTop: 2 }}>
        {d !== cur && d !== 'me' ? (
          <LimeFill style={{ paddingVertical: 13, alignItems: 'center' }}>
            <T size={14} w={800} color={brand.limeInk}>
              {cta}
            </T>
          </LimeFill>
        ) : (
          <View style={{ paddingVertical: 13, alignItems: 'center', borderRadius: 999, backgroundColor: d === cur ? palette.chip : palette.text }}>
            <T size={14} w={800} color={d === cur ? palette.text : palette.bg}>
              {cta}
            </T>
          </View>
        )}
      </Tap>
    </>
  );
}

export function NewListSheet() {
  const s = useApp((st) => st);
  const [name, setName] = useState('');
  const [vis, setVis] = useState<Vis>('friends');
  const [hasDate, setHasDate] = useState(false);
  const [month, setMonth] = useState<Month>('Dec');
  const [day, setDay] = useState('25');
  const [color, setColor] = useState<string>(listColors[0]);
  const ok = !!name.trim();

  const create = () => {
    if (!ok) return;
    const id = s.createList({ name: name.trim(), vis, accent: color, date: hasDate ? { month, day: parseInt(day, 10) } : undefined });
    s.closeSheet();
    s.go({ name: 'list', id });
    s.showToast(`${name.trim()} created`);
  };

  return (
    <>
      <SheetTitle>New list</SheetTitle>
      <Field value={name} onChangeText={setName} placeholder="e.g. Christmas, Graduation, Back to school" autoFocus accessibilityLabel="List name" />
      <SectionLabel>PRIVATE OR SHARED</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap' }}>
        {VIS_OPTS.map((o) => (
          <OptionPill key={o.k} label={o.title} on={vis === o.k} onPress={() => setVis(o.k)} size={12} />
        ))}
      </View>
      <ToggleRow title="It's for a date" sub="adds a countdown and nudges gifters" on={hasDate} onPress={() => setHasDate((x) => !x)} />
      {hasDate ? (
        <View style={{ flexDirection: 'row', gap: 8, alignItems: 'flex-start' }}>
          <Select value={month} options={MONTHS} onChange={setMonth} style={{ flex: 2 }} accessibilityLabel="Month" />
          <Select value={day} options={DAYS} onChange={setDay} style={{ flex: 1 }} accessibilityLabel="Day" />
        </View>
      ) : null}
      <SectionLabel>COLOR</SectionLabel>
      <View style={{ flexDirection: 'row', gap: 10 }}>
        {listColors.map((c) => (
          <Tap key={c} onPress={() => setColor(c)} accessibilityLabel={`Color ${c}`} accessibilityState={{ selected: color === c }} style={{ width: 34, height: 34, borderRadius: 10, backgroundColor: c, boxShadow: color === c ? `0 0 0 2px ${palette.card}, 0 0 0 4px ${c}` : undefined }} />
        ))}
      </View>
      <LimeButton label="Create list" size={13.5} pad={12} disabled={!ok} onPress={create} />
    </>
  );
}

export function ListSettingsSheet({ listId }: { listId: string }) {
  const s = useApp((st) => st);
  const list = listById(s, listId);
  const [armed, setArmed] = useState(false);
  const days = listDays(s, list);
  const isMain = list.id === 'w';
  const summary = list.vis === 'me' ? 'Private · only you' : `${friendsWithAccess(s, list.id).length} friends${list.vis === 'invite' ? ' + link' : ''}`;

  return (
    <>
      <SheetTitle>List settings</SheetTitle>
      <SectionLabel>NAME</SectionLabel>
      <Field value={list.name} onChangeText={(v) => s.updateList(list.id, { name: v })} accessibilityLabel="List name" />
      <Tap onPress={() => s.openSheet({ type: 'vis', listId: list.id })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.inset, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13 }}>
        <View style={{ flex: 1 }}>
          <T size={13} w={700}>
            Sharing
          </T>
          <T size={11} color={palette.muted}>
            {summary}
          </T>
        </View>
        <Chevron dir="right" size={14} color={palette.muted} />
      </Tap>
      {list.isBirthday ? (
        <Tap onPress={() => s.openSheet({ type: 'bday' })} style={{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: palette.inset, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13 }}>
          <T size={13} w={700} style={{ flex: 1 }}>
            Date · your birthday, {label(s.profile.birthday)}
          </T>
          <T size={12} w={700} color={palette.vio}>
            Change
          </T>
        </Tap>
      ) : list.date ? (
        <View style={{ backgroundColor: palette.inset, borderRadius: 12, paddingVertical: 11, paddingHorizontal: 13 }}>
          <T size={13} w={700}>
            Date · {label(list.date)} · in {days} days
          </T>
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
        <ChipButton
          label="Archive"
          size={13}
          flex
          onPress={() => {
            if (isMain) {
              s.showToast('My wants is your main list — it can’t be archived');
              return;
            }
            s.archiveList(list.id);
            s.tab('lists');
            s.showToast('Archived — find it in Settings');
          }}
        />
        <Tap
          onPress={() => {
            if (isMain) {
              s.showToast('My wants can’t be deleted');
              return;
            }
            if (!armed) {
              setArmed(true);
              return;
            }
            const nm = list.name;
            s.deleteList(list.id);
            s.tab('lists');
            s.showToast(`${nm} deleted`);
          }}
          style={{ flex: 1, paddingVertical: 12, borderRadius: 999, borderWidth: 1, borderColor: brand.pink, alignItems: 'center' }}
        >
          <T size={13} w={800} color={brand.pink}>
            {armed ? 'Tap again to delete' : 'Delete'}
          </T>
        </Tap>
      </View>
      <T size={11} color={palette.muted} style={{ textAlign: 'center' }}>
        {isMain ? 'My wants is where new shinies land by default.' : 'Archive keeps it for next year. Delete removes its shinies too.'}
      </T>
    </>
  );
}
