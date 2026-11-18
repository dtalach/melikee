import * as Clipboard from 'expo-clipboard';
import { useEffect, useState } from 'react';
import { Linking, TextInput, View } from 'react-native';

import type { SearchResult } from '@/lib/friendsContract';
import { searchPeople } from '@/lib/friends';
import { profileLink } from '@/lib/links';
import { QrStub } from '@/screens/Friends';
import { WantButton } from '@/screens/Feed';
import { useApp } from '@/store/useApp';
import { brand, font, palette } from '@/theme/tokens';
import { Search } from '@/ui/icons';
import { AccentButton, Avatar, ChipButton, PhotoBox, SectionLabel, SheetTitle, T, Tap, noOutline } from '@/ui/primitives';

export function InviteSheet() {
  const s = useApp((st) => st);
  const [q, setQ] = useState('');
  const [copied, setCopied] = useState(false);
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const link = profileLink(s.profile.handle);
  const secret = s.ownerSecret;
  const needle = q.trim();
  const searching = needle.replace(/^@/, '').length >= 2;

  // Search as you type, a moment after the last keystroke.
  useEffect(() => {
    let live = true;
    const t = setTimeout(async () => {
      if (!searching) {
        setResults(null);
        return;
      }
      const r = await searchPeople(secret, needle);
      if (live) setResults(r.ok ? r.results : []);
    }, 300);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [needle, searching, secret]);

  const act = async (p: SearchResult) => {
    setBusy(p.uid);
    if (p.state === 'incoming') {
      await s.acceptRequest(p.uid);
      setResults((rs) => rs?.map((x) => (x.uid === p.uid ? { ...x, state: 'friends' } : x)) ?? null);
    } else {
      const err = await s.sendRequest(p.uid, p.name);
      if (err) s.showToast(err);
      else setResults((rs) => rs?.map((x) => (x.uid === p.uid ? { ...x, state: 'outgoing' } : x)) ?? null);
    }
    setBusy(null);
  };

  return (
    <>
      <SheetTitle>Find your people</SheetTitle>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.vio44, borderRadius: 999, paddingVertical: 10, paddingHorizontal: 15 }}>
        <Search size={15} color={palette.muted} />
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="@handle or phone number"
          placeholderTextColor={palette.muted}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel="Search people"
          style={{ flex: 1, fontSize: 13, fontFamily: font[600], color: palette.text, padding: 0 , ...noOutline }}
        />
      </View>
      <View style={{ gap: 8 }}>
        {!searching ? (
          <T size={12} color={palette.muted} style={{ textAlign: 'center', padding: 4, lineHeight: 18 }}>
            Type a friend’s @handle, or their whole phone number.
          </T>
        ) : results && results.length === 0 ? (
          <T size={12} color={palette.muted} style={{ textAlign: 'center', padding: 4 }}>
            Nobody by that name yet — send them your link below.
          </T>
        ) : null}
        {searching && results
          ? results.map((p) => {
              const label = p.state === 'friends' ? 'Friends ✓' : p.state === 'outgoing' ? 'Requested ✓' : p.state === 'incoming' ? 'Accept' : 'Add';
              const done = p.state === 'friends' || p.state === 'outgoing';
              return (
                <View key={p.uid} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <Avatar initial={(p.name[0] ?? '?').toUpperCase()} size={38} ring={palette.deep} gap={palette.chip} w={700} fontSize={13} />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <T size={13} w={700} numberOfLines={1}>
                      {p.name === p.handle ? '' : `${p.name} `}
                      <T size={13} w={600} color={palette.vio}>
                        @{p.handle}
                      </T>
                    </T>
                    <T size={11} color={palette.muted}>
                      {p.state === 'incoming' ? 'wants to be friends' : p.state === 'friends' ? 'already friends' : 'on MeLikee'}
                    </T>
                  </View>
                  <Tap
                    disabled={done || busy === p.uid}
                    onPress={() => void act(p)}
                    accessibilityLabel={`${label} ${p.handle}`}
                    style={{ backgroundColor: done ? palette.chip : brand.lime, borderWidth: 1, borderColor: palette.vio44, paddingVertical: 6, paddingHorizontal: 14, borderRadius: 999, opacity: busy === p.uid ? 0.6 : 1 }}
                  >
                    <T size={11.5} w={800} color={done ? palette.muted : brand.limeInk}>
                      {label}
                    </T>
                  </Tap>
                </View>
              );
            })
          : null}
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
          style={{ flex: 1, backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.lime66, borderRadius: 10, paddingVertical: 11, paddingHorizontal: 12 }}
        >
          <SectionLabel>SEND YOUR LINK</SectionLabel>
          <T size={12} w={700} color={palette.limeText} style={{ marginTop: 2 }}>
            {link.display}
          </T>
          <T size={11} color={palette.muted} style={{ marginTop: 2 }}>
            {copied ? 'copied ✓' : 'tap to copy'}
          </T>
        </Tap>
        <View style={{ backgroundColor: palette.inset, borderWidth: 1, borderColor: palette.vio44, borderRadius: 10, padding: 9, alignItems: 'center', justifyContent: 'center', gap: 4 }}>
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
      <PhotoBox uri={f.image} style={{ height: 180, borderRadius: 10 }} />
      <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
        <T size={18} w={800} style={{ flex: 1 }}>
          {f.name}
        </T>
        <T size={18} w={800} color={palette.limeText}>
          {f.price}
        </T>
      </View>
      <T size={12} color={palette.muted} style={{ marginTop: -6 }}>
        {f.store} · on {who?.name ?? 'a friend'}’s {f.list}
      </T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <WantButton big wanted={f.wanted} onPress={() => wantToo(f.id)} />
        <AccentButton label={`Open at ${f.store}`} flex onPress={() => (f.url ? void Linking.openURL(f.url) : showToast('No store link for this one'))} />
      </View>
    </>
  );
}

export function ConfirmSheet({ action, friendId }: { action: 'remove' | 'block'; friendId: string }) {
  const friend = useApp((s) => s.friends.find((f) => f.id === friendId));
  const removeFriend = useApp((s) => s.removeFriend);
  const blockFriend = useApp((s) => s.blockFriend);
  const close = useApp((s) => s.closeSheet);
  const showToast = useApp((s) => s.showToast);
  if (!friend) return null;
  const block = action === 'block';
  const name = friend.name;
  return (
    <>
      <T size={24} w={300} style={{ letterSpacing: -0.6 }}>
        {block ? `Block ${name}?` : `Remove ${name}?`}
      </T>
      <T size={12.5} color={palette.muted} style={{ lineHeight: 19, marginTop: -4 }}>
        {block ? `${name} won’t be able to find you, see your lists, or send requests. They won’t be told.` : `${name} stops seeing your lists. You can add each other again later. They won’t be told.`}
      </T>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <ChipButton label="Cancel" flex onPress={close} />
        <Tap
          onPress={() => {
            void (block ? blockFriend(friend.id) : removeFriend(friend.id));
            close();
            showToast(block ? `${name} blocked` : `${name} removed`);
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
