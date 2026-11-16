import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import { TextInput, View } from 'react-native';

import { profileLink } from '@/lib/links';
import { QrStub } from '@/screens/Friends';
import { WantButton } from '@/screens/Feed';
import { useApp } from '@/store/useApp';
import { brand, font, palette, ringSoon } from '@/theme/tokens';
import { Search } from '@/ui/icons';
import { AccentButton, Avatar, ChipButton, PhotoBox, SectionLabel, SheetTitle, T, Tap, ToggleRow } from '@/ui/primitives';

export function InviteSheet() {
  const s = useApp((st) => st);
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState(false);
  const needle = q.trim().toLowerCase();
  const results = s.contacts.filter((c) => (needle ? `${c.name} ${c.handle}`.toLowerCase().includes(needle) : !c.searchOnly));
  const link = profileLink(s.profile.handle);

  return (
    <>
      <SheetTitle>Find your people</SheetTitle>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.vio44, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 15 }}>
        <Search size={15} color={palette.muted} />
        <TextInput value={q} onChangeText={setQ} placeholder="Search name or @handle" placeholderTextColor={palette.muted} autoCapitalize="none" style={{ flex: 1, fontSize: 13, fontFamily: font[600], color: palette.text, padding: 0 }} />
      </View>
      <View style={{ gap: 8 }}>
        {needle && results.length === 0 ? (
          <T size={12} color={palette.muted} style={{ textAlign: 'center', padding: 4 }}>
            Nobody by that name yet — send them your link below.
          </T>
        ) : null}
        {!needle ? <SectionLabel>PEOPLE YOU MAY KNOW</SectionLabel> : null}
        {results.map((c) => (
          <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <Avatar initial={c.initial} size={38} ring={c.mutual ? ringSoon : palette.deep} gap={palette.chip} w={700} fontSize={13} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <T size={13} w={700} numberOfLines={1} style={{ flexShrink: 1 }}>
                  {c.name} <T size={13} w={600} color={palette.vio}>{c.handle}</T>
                </T>
                {c.follows ? (
                  <View style={{ backgroundColor: palette.deep, paddingVertical: 2, paddingHorizontal: 7, borderRadius: 5 }}>
                    <T size={9} w={800} color={palette.soft}>
                      follows you
                    </T>
                  </View>
                ) : null}
              </View>
              {/* Safety: mutual friends only — never school or location. */}
              <T size={11} color={palette.muted}>
                {c.mutual ? `${c.mutual} mutual friends` : c.context}
              </T>
            </View>
            <Tap
              disabled={c.requested}
              onPress={() => {
                s.requestContact(c.id);
                s.showToast(`Request sent — ${c.name.split(' ')[0]} has to accept`);
              }}
              style={{ backgroundColor: c.requested ? palette.chip : brand.lime, borderWidth: 1, borderColor: palette.vio44, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999 }}
            >
              <T size={11.5} w={800} color={c.requested ? palette.muted : brand.limeInk}>
                {c.requested ? 'Requested ✓' : 'Add'}
              </T>
            </Tap>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <View style={{ flex: 1, height: 1, backgroundColor: palette.vio33 }} />
        <SectionLabel>NOT ON MELIKEE YET?</SectionLabel>
        <View style={{ flex: 1, height: 1, backgroundColor: palette.vio33 }} />
      </View>
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'stretch' }}>
        <Tap
          onPress={() => {
            Clipboard.setStringAsync(link.url).catch(() => undefined);
            setCopied(true);
            s.showToast('Link copied — send it anywhere');
          }}
          style={{ flex: 1, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.lime66, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 12 }}
        >
          <SectionLabel>SEND YOUR LINK</SectionLabel>
          <T size={12} w={700} color={palette.limeText} style={{ marginTop: 2 }}>
            {link.display}
          </T>
          <T size={11} color={palette.muted} style={{ marginTop: 2 }}>
            {copied ? 'copied ✓' : 'tap to copy'}
          </T>
        </Tap>
        <View style={{ backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.vio44, borderRadius: 14, padding: 9, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <QrStub />
          <T size={11} w={600} color={palette.muted}>
            or scan me
          </T>
        </View>
      </View>
      <T size={11} color={palette.muted} style={{ textAlign: 'center' }}>
        New friends see only lists you share. You approve everyone.
      </T>
    </>
  );
}

export function FeedItemSheet({ id }: { id: string }) {
  const f = useApp((s) => s.feed.find((x) => x.id === id));
  const who = useApp((s) => s.friends.find((p) => p.id === f?.friendId));
  const wantToo = useApp((s) => s.wantToo);
  const showToast = useApp((s) => s.showToast);
  if (!f) return null;
  return (
    <>
      <PhotoBox style={{ height: 180, borderRadius: 14 }} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <T size={18} w={800} style={{ flex: 1 }}>
          {f.name}
        </T>
        <T size={18} w={800} color={palette.limeText}>
          {f.price}
        </T>
      </View>
      <T size={12} color={palette.muted} style={{ marginTop: -6 }}>
        {f.store} · on {who?.name ?? 'a friend'}’s {f.list} · price checked today
      </T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <WantButton big wanted={f.wanted} onPress={() => wantToo(f.id)} />
        <AccentButton label={`Open at ${f.store}`} flex onPress={() => showToast(`Opens ${f.store}`)} />
      </View>
    </>
  );
}

export function ConfirmSheet({ action, friendId }: { action: 'remove' | 'block'; friendId: string }) {
  const friend = useApp((s) => s.friends.find((f) => f.id === friendId));
  const removeFriend = useApp((s) => s.removeFriend);
  const close = useApp((s) => s.closeSheet);
  const showToast = useApp((s) => s.showToast);
  const [report, setReport] = useState(true);
  if (!friend) return null;
  const block = action === 'block';
  const name = friend.name;
  return (
    <>
      <T size={17} w={800}>
        {block ? `Block ${name}?` : `Remove ${name}?`}
      </T>
      <T size={12.5} color={palette.muted} style={{ lineHeight: 19, marginTop: -4 }}>
        {block ? `${name} won’t be able to find you, see your lists, or send requests. They won’t be told.` : `${name} stops seeing your lists. You can add each other again later. They won’t be told.`}
      </T>
      {block ? (
        <View style={{ backgroundColor: palette.inset, borderRadius: 14, paddingVertical: 11, paddingHorizontal: 13 }}>
          <ToggleRow title="Also report to MeLikee" sub="a real person reviews it · they won't know it was you" on={report} onPress={() => setReport((r) => !r)} />
        </View>
      ) : null}
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ChipButton label="Cancel" flex onPress={close} />
        <Tap
          onPress={() => {
            removeFriend(friend.id);
            close();
            showToast(block ? `${name} blocked${report ? ' and reported' : ''}` : `${name} removed`);
          }}
          style={{ flex: 1, paddingVertical: 12, borderRadius: 999, backgroundColor: brand.pink, alignItems: 'center' }}
        >
          <T size={13.5} w={800} color={brand.white}>
            {block ? 'Block' : 'Remove'}
          </T>
        </Tap>
      </View>
    </>
  );
}
